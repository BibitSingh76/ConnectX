/**
 * WebRTC Service - Enterprise-grade WebRTC PeerConnection, ICE Recovery, and Device Manager
 */

/**
 * Dynamic ICE Server Resolver supporting STUN & Configurable TURN Servers
 */
const getRTCConfig = () => {
  const defaultServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnPassword = import.meta.env.VITE_TURN_PASSWORD;

  if (turnUrl) {
    const turnServer = { urls: turnUrl };
    if (turnUsername) turnServer.username = turnUsername;
    if (turnPassword) turnServer.credential = turnPassword;
    defaultServers.push(turnServer);
  }

  if (import.meta.env.VITE_ICE_SERVERS) {
    try {
      const customServers = JSON.parse(import.meta.env.VITE_ICE_SERVERS);
      if (Array.isArray(customServers) && customServers.length > 0) {
        return { iceServers: customServers, iceTransportPolicy: 'all' };
      }
    } catch (err) {
      console.warn('[WebRTCService] Failed to parse custom VITE_ICE_SERVERS:', err);
    }
  }

  return {
    iceServers: defaultServers,
    iceTransportPolicy: 'all',
  };
};

export const DEFAULT_MEDIA_CONSTRAINTS = {
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: 'user',
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

export const getSafeUserMedia = async (requestedConstraints = DEFAULT_MEDIA_CONSTRAINTS) => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('MediaDevices API not supported on this browser.');
  }

  try {
    return await navigator.mediaDevices.getUserMedia(requestedConstraints);
  } catch (err) {
    console.warn('[WebRTCService] Overconstrained media request, falling back to 480p basic constraints:', err);
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (fallbackErr) {
      console.warn('[WebRTCService] Fallback failed, attempting minimal unconstrained getUserMedia:', fallbackErr);
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
  }
};

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.screenStream = null;
    this.cameraVideoTrack = null;
    this.iceCandidateQueue = [];
    this.callbacks = {};
    this.isScreenSharing = false;
    this.deviceChangeListener = null;
    this.pendingMediaPromise = null;
    this.isRestartingIce = false;

    this.setupDeviceChangeMonitoring();
  }

  /**
   * Helper to reliably obtain video sender transceiver from peer connection
   */
  getVideoSender(pc = this.peerConnection) {
    if (!pc) return null;
    try {
      const transceiver = pc.getTransceivers().find(
        (t) => t.receiver && t.receiver.track && t.receiver.track.kind === 'video'
      );
      if (transceiver && transceiver.sender) return transceiver.sender;
    } catch (e) {
      // Fallback
    }
    return pc.getSenders().find((s) => s.track && s.track.kind === 'video') || null;
  }

  /**
   * Helper to reliably obtain audio sender transceiver from peer connection
   */
  getAudioSender(pc = this.peerConnection) {
    if (!pc) return null;
    try {
      const transceiver = pc.getTransceivers().find(
        (t) => t.receiver && t.receiver.track && t.receiver.track.kind === 'audio'
      );
      if (transceiver && transceiver.sender) return transceiver.sender;
    } catch (e) {
      // Fallback
    }
    return pc.getSenders().find((s) => s.track && s.track.kind === 'audio') || null;
  }

  /**
   * Monitor hardware device changes (unplugged camera/headset)
   */
  setupDeviceChangeMonitoring() {
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      if (this.deviceChangeListener) {
        navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeListener);
      }

      this.deviceChangeListener = async () => {
        console.log('[WebRTCService] Hardware device change detected');
        const devices = await this.getAvailableDevices();
        if (this.callbacks.onDevicesChange) {
          this.callbacks.onDevicesChange(devices);
        }

        if (this.cameraVideoTrack && this.cameraVideoTrack.readyState === 'ended') {
          console.warn('[WebRTCService] Active camera track ended due to device disconnection');
          if (this.callbacks.onError) {
            this.callbacks.onError('Camera device disconnected. Switching to fallback...');
          }
        }
      };

      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeListener);
    }
  }

  removeDeviceChangeMonitoring() {
    if (typeof window !== 'undefined' && navigator.mediaDevices && this.deviceChangeListener) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeListener);
      this.deviceChangeListener = null;
    }
  }

  /**
   * Request local camera and microphone media stream safely without race conditions
   */
  async getLocalMediaStream(requestedConstraints) {
    const targetConstraints = requestedConstraints || DEFAULT_MEDIA_CONSTRAINTS;

    // If stream already exists and all tracks are live, reuse it
    if (this.localStream) {
      const allLive =
        this.localStream.getTracks().length > 0 &&
        this.localStream.getTracks().every((t) => t.readyState === 'live');
      if (allLive) {
        return this.localStream;
      }
      // Stop stale stream tracks before re-acquiring
      this.localStream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.localStream = null;
    }

    // Prevent concurrent getUserMedia calls
    if (this.pendingMediaPromise) {
      return this.pendingMediaPromise;
    }

    this.pendingMediaPromise = (async () => {
      try {
        const stream = await getSafeUserMedia(targetConstraints);
        this.localStream = stream;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          this.cameraVideoTrack = videoTrack;
        }

        stream.getTracks().forEach((track) => {
          track.onended = () => {
            console.warn(`[WebRTCService] Local track [${track.kind}] ended`);
          };
        });

        if (this.callbacks.onLocalStream) {
          this.callbacks.onLocalStream(this.localStream);
        }
        return this.localStream;
      } catch (error) {
        console.error('[WebRTCService] UserMedia access denied or failed:', error);
        let userFriendlyMessage = 'Camera/Microphone access failed';
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          userFriendlyMessage = 'Camera and Microphone permissions were denied by the browser.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          userFriendlyMessage = 'No camera or microphone hardware found on this device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          userFriendlyMessage = 'Camera or Microphone is currently in use by another application.';
        }

        if (this.callbacks.onError) {
          this.callbacks.onError(userFriendlyMessage);
        }
        throw new Error(userFriendlyMessage);
      } finally {
        this.pendingMediaPromise = null;
      }
    })();

    return this.pendingMediaPromise;
  }

  /**
   * Enumerate available video and audio devices
   */
  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        videoInputs: devices.filter((d) => d.kind === 'videoinput'),
        audioInputs: devices.filter((d) => d.kind === 'audioinput'),
        audioOutputs: devices.filter((d) => d.kind === 'audiooutput'),
      };
    } catch (error) {
      console.error('[WebRTCService] Error enumerating devices:', error);
      return { videoInputs: [], audioInputs: [], audioOutputs: [] };
    }
  }

  /**
   * Switch video camera input source
   */
  async switchCamera(deviceId) {
    if (!this.localStream) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      const oldTrack = this.localStream.getVideoTracks()[0];
      if (oldTrack) {
        // Sync enabled state so camera off state is preserved
        newVideoTrack.enabled = oldTrack.enabled;
        this.localStream.removeTrack(oldTrack);
        oldTrack.onended = null;
        oldTrack.stop();
      }

      newVideoTrack.onended = () => {
        console.warn('[WebRTCService] Switched camera track ended');
      };

      this.localStream.addTrack(newVideoTrack);
      this.cameraVideoTrack = newVideoTrack;

      if (this.peerConnection && !this.isScreenSharing) {
        const videoSender = this.getVideoSender();
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }
      console.log('[WebRTCService] Successfully switched camera device');
    } catch (error) {
      console.error('[WebRTCService] Error switching camera:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to switch camera device');
      }
    }
  }

  /**
   * Switch audio microphone input source dynamically using replaceTrack
   */
  async switchMicrophone(deviceId) {
    if (!this.localStream) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false,
      });
      const newAudioTrack = newStream.getAudioTracks()[0];
      if (!newAudioTrack) return;

      const oldTrack = this.localStream.getAudioTracks()[0];
      if (oldTrack) {
        // Sync enabled state so mute state is preserved
        newAudioTrack.enabled = oldTrack.enabled;
        this.localStream.removeTrack(oldTrack);
        oldTrack.onended = null;
        oldTrack.stop();
      }

      newAudioTrack.onended = () => {
        console.warn('[WebRTCService] Switched microphone track ended');
      };

      this.localStream.addTrack(newAudioTrack);

      if (this.peerConnection) {
        const audioSender = this.getAudioSender();
        if (audioSender) {
          await audioSender.replaceTrack(newAudioTrack);
        }
      }

      if (this.callbacks.onLocalStream) {
        this.callbacks.onLocalStream(this.localStream);
      }
      console.log('[WebRTCService] Successfully switched microphone device');
    } catch (error) {
      console.error('[WebRTCService] Error switching microphone:', error);
      if (this.callbacks.onError) {
        this.callbacks.onError('Failed to switch microphone device');
      }
    }
  }

  /**
   * Switch audio output speaker device via setSinkId if supported
   */
  async switchSpeaker(elementRef, deviceId) {
    if (!elementRef) return;
    if (typeof elementRef.setSinkId === 'function') {
      try {
        await elementRef.setSinkId(deviceId);
        console.log(`[WebRTCService] Audio output sink set to ${deviceId}`);
      } catch (error) {
        console.error('[WebRTCService] Error setting audio output sink:', error);
      }
    } else {
      console.warn('[WebRTCService] setSinkId() is not supported in this browser');
    }
  }

  /**
   * Start Screen Sharing using getDisplayMedia()
   */
  async startScreenShare() {
    if (this.isScreenSharing && this.screenStream) return this.screenStream;
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (!screenTrack) {
        throw new Error('No video track found in screen share stream');
      }

      this.isScreenSharing = true;

      if (this.peerConnection) {
        const videoSender = this.getVideoSender();
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        console.log('[WebRTCService] Native screen share ended by user/browser');
        this.stopScreenShare();
      };

      if (this.callbacks.onScreenShareChange) {
        this.callbacks.onScreenShareChange(true, this.screenStream);
      }
      return this.screenStream;
    } catch (error) {
      console.error('[WebRTCService] Error starting screen share:', error);
      this.isScreenSharing = false;
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((t) => {
          t.onended = null;
          t.stop();
        });
        this.screenStream = null;
      }
      if (this.callbacks.onScreenShareChange) {
        this.callbacks.onScreenShareChange(false, null);
      }
      throw error;
    }
  }

  /**
   * Stop Screen Sharing and restore camera track
   */
  async stopScreenShare() {
    if (!this.isScreenSharing && !this.screenStream) return;

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.screenStream = null;
    }

    this.isScreenSharing = false;

    if (this.peerConnection && this.cameraVideoTrack && this.cameraVideoTrack.readyState === 'live') {
      const videoSender = this.getVideoSender();
      if (videoSender) {
        await videoSender.replaceTrack(this.cameraVideoTrack);
      }
    }

    if (this.callbacks.onScreenShareChange) {
      this.callbacks.onScreenShareChange(false, null);
    }
    console.log('[WebRTCService] Screen sharing stopped, camera track restored');
  }

  /**
   * Initialize RTCPeerConnection cleanly without duplicates
   */
  createPeerConnection(roomId, socketService, callbacks = {}) {
    this.callbacks = { ...this.callbacks, ...callbacks };

    if (this.peerConnection) {
      console.log('[WebRTCService] Closing previous RTCPeerConnection before re-creating');
      this.closePeerConnection();
    }

    this.iceCandidateQueue = [];
    const rtcConfig = getRTCConfig();
    this.peerConnection = new RTCPeerConnection(rtcConfig);
    console.log('[WebRTCService] RTCPeerConnection created with ICE servers:', rtcConfig.iceServers.length);

    // Add local tracks (or screen track if screen sharing)
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        if (track.readyState === 'live') {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      if (this.isScreenSharing && this.screenStream) {
        const screenTrack = this.screenStream.getVideoTracks()[0];
        if (screenTrack && screenTrack.readyState === 'live') {
          this.peerConnection.addTrack(screenTrack, this.screenStream);
        }
      } else {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack && videoTrack.readyState === 'live') {
          this.peerConnection.addTrack(videoTrack, this.localStream);
        }
      }
    }

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTCService] Incoming remote track received:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      if (event.track) {
        if (!this.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
        event.track.onended = () => {
          console.log(`[WebRTCService] Remote track [${event.track.kind}] ended`);
          if (this.remoteStream) {
            this.remoteStream.removeTrack(event.track);
          }
        };
      }
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(this.remoteStream);
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketService) {
        socketService.sendIceCandidate(roomId, event.candidate);
      }
    };

    this.peerConnection.onicegatheringstatechange = () => {
      if (this.peerConnection) {
        console.log('[WebRTCService] iceGatheringState:', this.peerConnection.iceGatheringState);
      }
    };

    const updateCombinedState = async () => {
      if (!this.peerConnection) {
        if (this.callbacks.onConnectionStateChange) this.callbacks.onConnectionStateChange('disconnected');
        return;
      }

      const state = this.peerConnection.connectionState;
      const iceState = this.peerConnection.iceConnectionState;

      let status = 'connecting';
      if (state === 'connected' || iceState === 'connected' || iceState === 'completed') {
        status = 'connected';
      } else if (state === 'disconnected' || iceState === 'disconnected' || iceState === 'checking') {
        status = 'reconnecting';
      } else if (state === 'failed' || iceState === 'failed' || state === 'closed') {
        status = 'disconnected';
      }

      if ((iceState === 'failed' || iceState === 'disconnected') && !this.isRestartingIce) {
        console.warn(`[WebRTCService] ICE connection state is ${iceState} -> attempting ICE restart`);
        this.restartIce(roomId, socketService);
      }

      console.log(`[WebRTCService] Status: ${status} (conn: ${state}, ice: ${iceState})`);
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(status);
      }
    };

    this.peerConnection.onconnectionstatechange = updateCombinedState;
    this.peerConnection.oniceconnectionstatechange = updateCombinedState;

    return this.peerConnection;
  }

  /**
   * Execute ICE restart cleanly
   */
  async restartIce(roomId, socketService) {
    if (!this.peerConnection || this.isRestartingIce) return;
    this.isRestartingIce = true;
    try {
      console.log('[WebRTCService] Executing ICE restart offer...');
      if (typeof this.peerConnection.restartIce === 'function') {
        this.peerConnection.restartIce();
      }
      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);
      if (socketService) {
        socketService.sendOffer(roomId, offer);
      }
    } catch (error) {
      console.error('[WebRTCService] Error executing ICE restart:', error);
    } finally {
      setTimeout(() => {
        this.isRestartingIce = false;
      }, 3000);
    }
  }

  async createOffer(roomId, socketService) {
    if (!this.peerConnection) return;
    if (this.peerConnection.signalingState !== 'stable') {
      console.warn('[WebRTCService] Cannot create offer: signalingState is not stable:', this.peerConnection.signalingState);
      return;
    }
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTCService] Local offer set cleanly');
      if (socketService) {
        socketService.sendOffer(roomId, offer);
      }
    } catch (error) {
      console.error('[WebRTCService] Error creating offer:', error);
      if (this.callbacks.onError) this.callbacks.onError('Failed to create WebRTC offer');
    }
  }

  async handleOffer(offer, roomId, socketService) {
    if (!this.peerConnection || this.peerConnection.connectionState === 'closed' || this.peerConnection.connectionState === 'failed') {
      this.createPeerConnection(roomId, socketService);
    }
    try {
      // Glare handling: if signalingState is not stable (e.g. have-local-offer), rollback
      if (this.peerConnection.signalingState !== 'stable') {
        console.warn('[WebRTCService] Rolling back local description due to incoming offer glare');
        await this.peerConnection.setLocalDescription({ type: 'rollback' });
      }

      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await this.processIceCandidateQueue();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      if (socketService) {
        socketService.sendAnswer(roomId, answer);
      }
    } catch (error) {
      console.error('[WebRTCService] Error handling offer:', error);
      if (this.callbacks.onError) this.callbacks.onError('Failed to process WebRTC offer');
    }
  }

  async handleAnswer(answer) {
    if (!this.peerConnection) return;
    if (this.peerConnection.signalingState !== 'have-local-offer') {
      console.warn('[WebRTCService] Ignoring answer: signalingState is not have-local-offer:', this.peerConnection.signalingState);
      return;
    }
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processIceCandidateQueue();
    } catch (error) {
      console.error('[WebRTCService] Error handling answer:', error);
      if (this.callbacks.onError) this.callbacks.onError('Failed to process WebRTC answer');
    }
  }

  async handleIceCandidate(candidate) {
    if (!candidate) return;
    if (!this.peerConnection || !this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
      this.iceCandidateQueue.push(candidate);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('[WebRTCService] Error adding ICE candidate:', error);
    }
  }

  async processIceCandidateQueue() {
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      if (!candidate) continue;
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('[WebRTCService] Error adding queued candidate:', error);
      }
    }
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      this.peerConnection.onicegatheringstatechange = null;
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn('[WebRTCService] Error closing PC:', e);
      }
      this.peerConnection = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.screenStream = null;
    }
    this.isScreenSharing = false;

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      this.remoteStream = null;
    }

    this.iceCandidateQueue = [];

    if (this.callbacks.onRemoteStream) {
      this.callbacks.onRemoteStream(null);
    }
    if (this.callbacks.onScreenShareChange) {
      this.callbacks.onScreenShareChange(false, null);
    }
  }

  stopAllMedia() {
    this.closePeerConnection();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      this.localStream = null;
    }
    this.cameraVideoTrack = null;

    if (this.callbacks.onLocalStream) {
      this.callbacks.onLocalStream(null);
    }

    this.removeDeviceChangeMonitoring();
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;
