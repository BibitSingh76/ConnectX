import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Users,
  Sliders,
  Copy,
  Check,
  ShieldCheck,
  UserCheck,
  Wifi,
  AlertTriangle,
  User,
} from 'lucide-react';
import { Button } from '../components/Button';
import { ChatPanel } from '../components/panels/ChatPanel';
import { ParticipantsPanel } from '../components/panels/ParticipantsPanel';
import { SettingsModal } from '../components/modals/SettingsModal';
import { ConfirmModal } from '../components/modals/ConfirmModal';
import { useWebRTC } from '../hooks/useWebRTC';
import { useMeeting } from '../context/MeetingContext';
import { useToast } from '../context/ToastContext';
import socketService from '../services/socketService';

export const Meeting = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { userName, isMicOn, setIsMicOn, isCamOn, setIsCamOn } = useMeeting();
  const { addToast } = useToast();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [copied, setCopied] = useState(false);
  const [activePanel, setActivePanel] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfirmLeaveOpen, setIsConfirmLeaveOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const [remoteParticipants, setRemoteParticipants] = useState([]);

  const {
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
  } = useWebRTC(roomId);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = isScreenSharing && screenStream ? screenStream : localStream;
    }
  }, [localStream, screenStream, isScreenSharing]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!roomId) return;

    socketService.on('peer_joined', ({ socketId }) => {
      addToast('Remote participant connected to room', 'info');
      setRemoteParticipants([
        {
          id: socketId,
          socketId,
          name: 'Remote Peer',
          isMicOn: true,
          isCamOn: true,
        },
      ]);
    });

    socketService.on('peer_left', () => {
      addToast('Remote participant left the room', 'info');
      setRemoteParticipants([]);
    });

    socketService.on('peer_media_status', ({ socketId, isMicOn: remoteMic, isCamOn: remoteCam }) => {
      setRemoteParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isMicOn: remoteMic, isCamOn: remoteCam } : p))
      );
    });

    return () => {
      socketService.off('peer_joined');
      socketService.off('peer_left');
      socketService.off('peer_media_status');
    };
  }, [roomId, addToast]);

  useEffect(() => {
    if (roomId) {
      socketService.sendMediaStatus(roomId, isMicOn, isCamOn);
    }
  }, [roomId, isMicOn, isCamOn]);

  const handleToggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    toggleMic(nextState);
    socketService.sendMediaStatus(roomId, nextState, isCamOn);
    addToast(`Microphone ${nextState ? 'unmuted' : 'muted'}`, 'info');
  };

  const handleToggleCam = () => {
    const nextState = !isCamOn;
    setIsCamOn(nextState);
    toggleCam(nextState);
    socketService.sendMediaStatus(roomId, isMicOn, nextState);
    addToast(`Camera ${nextState ? 'turned on' : 'turned off'}`, 'info');
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      addToast('Screen sharing stopped', 'info');
    } else {
      try {
        await startScreenShare();
        addToast('Screen sharing started', 'success');
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    }
  };

  const copyInvite = () => {
    const fullUrl = `${window.location.origin}/prejoin/${roomId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    addToast('Room invite link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmLeave = () => {
    leaveCall();
    addToast('Left meeting call', 'info');
    navigate('/');
  };

  const togglePanel = (panelName) => {
    if (panelName === 'chat' && activePanel !== 'chat') {
      setUnreadChatCount(0);
    }
    setActivePanel((prev) => (prev === panelName ? null : panelName));
  };

  const handleNewUnreadMessage = () => {
    if (activePanel !== 'chat') {
      setUnreadChatCount((prev) => prev + 1);
    }
  };

  const statusStyles = {
    connecting: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    connected: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    reconnecting: 'text-rose-400 bg-rose-500/10 border-rose-500/20 animate-pulse',
    disconnected: 'text-slate-400 bg-slate-800 border-slate-700',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden relative">
      {permissionError && (
        <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-rose-300 text-xs text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold">
            <span className="text-slate-400">Room:</span>
            <span className="text-indigo-400">{roomId}</span>
          </div>

          <div
            className={`hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl border ${
              statusStyles[connectionState] || statusStyles.connecting
            }`}
          >
            <Wifi className={`w-3.5 h-3.5 ${connectionState === 'connected' ? 'animate-pulse' : ''}`} />
            <span className="capitalize">{connectionState}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="secondary"
            onClick={copyInvite}
            className="!py-1.5 !px-3 text-xs border-slate-800"
            icon={copied ? Check : Copy}
            aria-label="Copy Invite Link"
          >
            {copied ? 'Copied Link' : 'Invite'}
          </Button>

          <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700/50 flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{remoteStream ? '2/2' : '1/2'}</span>
          </span>
        </div>
      </div>

      {/* Center Stage & Panels Container */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative bg-slate-950 p-4 flex items-center justify-center min-h-0">
          <div className="w-full h-full bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden relative flex items-center justify-center shadow-2xl">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${remoteStream ? 'block' : 'hidden'}`}
            />

            {!remoteStream && (
              <div className="flex flex-col items-center justify-center gap-3 text-slate-400 max-w-sm text-center p-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-500/5">
                  <UserCheck className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-200">Waiting for Remote Peer</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Share the room link. Once another participant opens it, WebRTC peer video will connect directly.
                </p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${remoteStream ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{remoteStream ? 'Remote Peer' : 'Waiting for peer...'}</span>
            </div>
          </div>

          <div className="absolute top-8 right-8 w-44 sm:w-60 aspect-video bg-slate-900 border-2 border-indigo-500/30 rounded-2xl overflow-hidden shadow-2xl z-10 flex items-center justify-center group hover:scale-105 transition-all">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                (localStream && isCamOn) || isScreenSharing ? 'block' : 'hidden'
              }`}
            />

            {(!localStream || (!isCamOn && !isScreenSharing)) && (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                  {userName ? userName.charAt(0) : <User className="w-5 h-5" />}
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Camera Off</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-300 border border-slate-800 flex items-center gap-1.5">
              <span>{userName || 'You'}</span>
              {!isMicOn && <MicOff className="w-3 h-3 text-rose-400" />}
              {isScreenSharing && <Monitor className="w-3 h-3 text-indigo-400" />}
            </div>
          </div>
        </div>

        <ChatPanel
          isOpen={activePanel === 'chat'}
          onClose={() => setActivePanel(null)}
          roomId={roomId}
          currentUserName={userName}
          onNewMessageRead={handleNewUnreadMessage}
        />

        <ParticipantsPanel
          isOpen={activePanel === 'participants'}
          onClose={() => setActivePanel(null)}
          participants={remoteParticipants}
          currentUserName={userName}
          isMicOn={isMicOn}
          isCamOn={isCamOn}
        />
      </div>

      {/* Bottom Control Bar */}
      <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between z-20">
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ConnectX Secure P2P Call</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 mx-auto md:mx-0">
          <button
            onClick={handleToggleMic}
            className={`p-3.5 rounded-2xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isMicOn
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
            }`}
            title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
            aria-label={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          <button
            onClick={handleToggleCam}
            className={`p-3.5 rounded-2xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isCamOn
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
            }`}
            title={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
            aria-label={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={handleToggleScreenShare}
            className={`p-3.5 rounded-2xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isScreenSharing
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
            aria-label={isScreenSharing ? 'Stop Screen Sharing' : 'Start Screen Sharing'}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </button>

          <div className="w-px h-8 bg-slate-800 mx-1 hidden sm:block" />

          <button
            onClick={() => togglePanel('chat')}
            className={`p-3.5 rounded-2xl transition duration-200 relative focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              activePanel === 'chat'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Meeting Chat"
            aria-label="Meeting Chat"
          >
            <MessageSquare className="w-5 h-5" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
                {unreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={() => togglePanel('participants')}
            className={`p-3.5 rounded-2xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              activePanel === 'participants'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Participants List"
            aria-label="Participants List"
          >
            <Users className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Audio & Video Settings"
            aria-label="Audio & Video Settings"
          >
            <Sliders className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsConfirmLeaveOpen(true)}
            className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition duration-200 ml-2 focus:outline-none focus:ring-2 focus:ring-rose-500"
            title="Leave Call"
            aria-label="Leave Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        <div className="hidden md:block w-32" />
      </div>

      {/* Device Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        devices={devices}
        onSwitchCamera={switchCamera}
        onSwitchMicrophone={switchMicrophone}
        onSwitchSpeaker={switchSpeaker}
        remoteVideoRef={remoteVideoRef}
      />

      {/* Leave Call Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmLeaveOpen}
        onClose={() => setIsConfirmLeaveOpen(false)}
        onConfirm={handleConfirmLeave}
        title="Leave Meeting?"
        message="Are you sure you want to exit the current call? You can rejoin anytime using the room code."
      />
    </div>
  );
};
