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

    const setupCall = async () => {
      await initializeMedia();

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

      socketService.connect();
      socketService.joinRoom(roomId);

      socketService.on('room_joined', async () => {
        if (!isSubscribed) return;
        webrtcService.createPeerConnection(roomId, socketService);
      });

      socketService.on('peer_joined', async () => {
        if (!isSubscribed) return;
        webrtcService.createPeerConnection(roomId, socketService);
        await webrtcService.createOffer(roomId, socketService);
      });

      socketService.on('webrtc_offer', async ({ offer }) => {
        if (!isSubscribed) return;
        await webrtcService.handleOffer(offer, roomId, socketService);
      });

      socketService.on('webrtc_answer', async ({ answer }) => {
        if (!isSubscribed) return;
        await webrtcService.handleAnswer(answer);
      });

      socketService.on('ice_candidate', async ({ candidate }) => {
        if (!isSubscribed) return;
        await webrtcService.handleIceCandidate(candidate);
      });

      socketService.on('peer_left', () => {
        if (!isSubscribed) return;
        webrtcService.closePeerConnection();
        setRemoteStream(null);
        setConnectionState('disconnected');
      });
    };

    setupCall();

    return () => {
      isSubscribed = false;
      socketService.leaveRoom(roomId);
      socketService.off('room_joined');
      socketService.off('peer_joined');
      socketService.off('webrtc_offer');
      socketService.off('webrtc_answer');
      socketService.off('ice_candidate');
      socketService.off('peer_left');
      webrtcService.closePeerConnection();
    };
  }, [roomId, initializeMedia]);

  const toggleMic = (enabled) => {
    webrtcService.toggleAudio(enabled);
  };

  const toggleCam = (enabled) => {
    webrtcService.toggleVideo(enabled);
  };

  const startScreenShare = async () => {
    return await webrtcService.startScreenShare();
  };

  const stopScreenShare = async () => {
    await webrtcService.stopScreenShare();
  };

  const switchCamera = async (deviceId) => {
    await webrtcService.switchCamera(deviceId);
  };

  const switchMicrophone = async (deviceId) => {
    await webrtcService.switchMicrophone(deviceId);
  };

  const switchSpeaker = async (elementRef, deviceId) => {
    await webrtcService.switchSpeaker(elementRef, deviceId);
  };

  const leaveCall = () => {
    socketService.leaveRoom(roomId);
    webrtcService.stopAllMedia();
  };

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
