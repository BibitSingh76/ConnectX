import { useEffect, useState, useCallback } from 'react';
import socketService from '../services/socketService';
import webrtcService from '../services/webrtcService';

export const useWebRTC = (roomId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [permissionError, setPermissionError] = useState(null);
  const [devices, setDevices] = useState({ videoInputs: [], audioInputs: [], audioOutputs: [] });

  const initializeMedia = useCallback(async () => {
    try {
      setPermissionError(null);
      const stream = await webrtcService.getLocalMediaStream();
      setLocalStream(stream);

      const availDevices = await webrtcService.getAvailableDevices();
      setDevices(availDevices);

      return stream;
    } catch (err) {
      setPermissionError(err.message || 'Camera/Microphone access denied');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let isSubscribed = true;

    webrtcService.callbacks = {
      onLocalStream: (stream) => {
        if (isSubscribed) setLocalStream(stream);
      },
      onRemoteStream: (stream) => {
        if (isSubscribed) setRemoteStream(stream);
      },
      onScreenShareChange: (isSharing, displayStream) => {
        if (isSubscribed) {
          setIsScreenSharing(isSharing);
          setScreenStream(displayStream);
        }
      },
      onDevicesChange: (availDevices) => {
        if (isSubscribed) setDevices(availDevices);
      },
      onConnectionStateChange: (state) => {
        if (isSubscribed) setConnectionState(state);
      },
      onError: (errMsg) => {
        if (isSubscribed) setPermissionError(errMsg);
      },
    };

    const handleRoomJoined = async ({ isInitiator, participantsCount } = {}) => {
      if (!isSubscribed) return;
      if (participantsCount === 2 || !isInitiator) {
        if (!webrtcService.peerConnection) {
          webrtcService.createPeerConnection(roomId, socketService);
        }
      }
    };

    const handlePeerJoined = async () => {
      if (!isSubscribed) return;
      webrtcService.createPeerConnection(roomId, socketService);
      await webrtcService.createOffer(roomId, socketService);
    };

    const handleWebRTCOffer = async ({ offer }) => {
      if (!isSubscribed) return;
      await webrtcService.handleOffer(offer, roomId, socketService);
    };

    const handleWebRTCAnswer = async ({ answer }) => {
      if (!isSubscribed) return;
      await webrtcService.handleAnswer(answer);
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!isSubscribed) return;
      await webrtcService.handleIceCandidate(candidate);
    };

    const handlePeerLeft = () => {
      if (!isSubscribed) return;
      webrtcService.closePeerConnection();
      setRemoteStream(null);
      setConnectionState('disconnected');
    };

    socketService.connect();
    socketService.on('room_joined', handleRoomJoined);
    socketService.on('peer_joined', handlePeerJoined);
    socketService.on('webrtc_offer', handleWebRTCOffer);
    socketService.on('webrtc_answer', handleWebRTCAnswer);
    socketService.on('ice_candidate', handleIceCandidate);
    socketService.on('peer_left', handlePeerLeft);

    const setupCall = async () => {
      await initializeMedia();
      if (isSubscribed) {
        socketService.joinRoom(roomId);
      }
    };

    setupCall();

    return () => {
      isSubscribed = false;
      socketService.off('room_joined', handleRoomJoined);
      socketService.off('peer_joined', handlePeerJoined);
      socketService.off('webrtc_offer', handleWebRTCOffer);
      socketService.off('webrtc_answer', handleWebRTCAnswer);
      socketService.off('ice_candidate', handleIceCandidate);
      socketService.off('peer_left', handlePeerLeft);
      socketService.leaveRoom(roomId);
      webrtcService.stopAllMedia();
    };
  }, [roomId, initializeMedia]);

  const toggleMic = useCallback((enabled) => {
    webrtcService.toggleAudio(enabled);
  }, []);

  const toggleCam = useCallback((enabled) => {
    webrtcService.toggleVideo(enabled);
  }, []);

  const startScreenShare = useCallback(async () => {
    return await webrtcService.startScreenShare();
  }, []);

  const stopScreenShare = useCallback(async () => {
    await webrtcService.stopScreenShare();
  }, []);

  const switchCamera = useCallback(async (deviceId) => {
    await webrtcService.switchCamera(deviceId);
  }, []);

  const switchMicrophone = useCallback(async (deviceId) => {
    await webrtcService.switchMicrophone(deviceId);
  }, []);

  const switchSpeaker = useCallback(async (elementRef, deviceId) => {
    await webrtcService.switchSpeaker(elementRef, deviceId);
  }, []);

  const leaveCall = useCallback(() => {
    socketService.leaveRoom(roomId);
    webrtcService.stopAllMedia();
  }, [roomId]);

  return {
    localStream,
    remoteStream,
    screenStream,
    isScreenSharing,
    connectionState,
    permissionError,
    devices,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    switchSpeaker,
    leaveCall,
    reinitializeMedia: initializeMedia,
  };
};
