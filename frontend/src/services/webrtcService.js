/**
 * WebRTC Service - Enterprise-grade WebRTC PeerConnection, ICE Recovery, and Device Manager
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
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

    this.setupDeviceChangeMonitoring();
  }

  /**
   * Monitor hardware device changes (unplugged camera/headset)
   */
  setupDeviceChangeMonitoring() {
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
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

  /**
   * Request local camera and microphone media stream
   */
  async getLocalMediaStream(constraints = { video: true, audio: true }) {
    if (this.localStream) {
      return this.localStream;
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        this.cameraVideoTrack = videoTrack;
      }

      this.localStream.getTracks().forEach((track) => {
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
    }
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

      const oldTrack = this.localStream.getVideoTracks()[0];
      if (oldTrack) {
        this.localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }

      this.localStream.addTrack(newVideoTrack);
      this.cameraVideoTrack = newVideoTrack;

      if (this.peerConnection && !this.isScreenSharing) {
        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
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

      const oldTrack = this.localStream.getAudioTracks()[0];
      if (oldTrack) {
        this.localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }

      this.localStream.addTrack(newAudioTrack);

      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        const audioSender = senders.find((s) => s.track && s.track.kind === 'audio');
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
    if (this.isScreenSharing) return;
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];
      this.isScreenSharing = true;

      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
        console.log('[WebRTCService] Native screen share ended by user');
        this.stopScreenShare();
      };

      if (this.callbacks.onScreenShareChange) {
        this.callbacks.onScreenShareChange(true, this.screenStream);
      }
      return this.screenStream;
    } catch (error) {
      console.error('[WebRTCService] Error starting screen share:', error);
      this.isScreenSharing = false;
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
    if (!this.isScreenSharing) return;

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }

    this.isScreenSharing = false;

    if (this.peerConnection && this.cameraVideoTrack) {
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
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
    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
    console.log('[WebRTCService] RTCPeerConnection created');

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTCService] Incoming remote track received:', event.track.kind);
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      event.streams[0].getTracks().forEach((track) => {
        if (!this.remoteStream.getTracks().some((t) => t.id === track.id)) {
          this.remoteStream.addTrack(track);
        }
      });
      if (this.callbacks.onRemoteStream) {
        this.callbacks.onRemoteStream(this.remoteStream);
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
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

      if (iceState === 'failed' && this.peerConnection.restartIce) {
        console.warn('[WebRTCService] ICE connection failed -> attempting ICE restart');
        try {
          this.peerConnection.restartIce();
        } catch (e) {
          console.error('[WebRTCService] ICE restart failed:', e);
        }
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
      socketService.sendOffer(roomId, offer);
    } catch (error) {
      console.error('[WebRTCService] Error creating offer:', error);
      if (this.callbacks.onError) this.callbacks.onError('Failed to create WebRTC offer');
    }
  }

  async handleOffer(offer, roomId, socketService) {
    if (!this.peerConnection) {
      this.createPeerConnection(roomId, socketService);
    }
    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await this.processIceCandidateQueue();

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      socketService.sendAnswer(roomId, answer);
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
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    this.isScreenSharing = false;
    this.remoteStream = null;
    this.iceCandidateQueue = [];
    if (this.callbacks.onRemoteStream) {
      this.callbacks.onRemoteStream(null);
    }
  }

  stopAllMedia() {
    this.closePeerConnection();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.cameraVideoTrack = null;
    if (this.callbacks.onLocalStream) {
      this.callbacks.onLocalStream(null);
    }
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;
