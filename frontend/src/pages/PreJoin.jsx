import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, Copy, Check, ArrowRight, Sliders, User, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SettingsModal } from '../components/modals/SettingsModal';
import { useMeeting } from '../context/MeetingContext';
import { useToast } from '../context/ToastContext';
import { joinMeetingApi } from '../services/apiService';
import { getSafeUserMedia } from '../services/webrtcService';

export const PreJoin = () => {
  const { roomId: paramRoomId } = useParams();
  const navigate = useNavigate();
  const { roomId, setRoomId, userName, setUserName, isMicOn, setIsMicOn, isCamOn, setIsCamOn } = useMeeting();
  const { addToast } = useToast();

  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const currentRoomId = paramRoomId || roomId;

  useEffect(() => {
    if (paramRoomId) {
      setRoomId(paramRoomId);
    }

    let isMounted = true;
    let localStream;
    const setupCamera = async () => {
      try {
        localStream = await getSafeUserMedia();
        if (!isMounted) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }
        setStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Camera/Microphone access notice:', err);
          setMediaError('Could not access camera/microphone preview.');
        }
      }
    };

    setupCamera();

    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [paramRoomId, setRoomId]);

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    } else {
      setIsMicOn(!isMicOn);
    }
  };

  const toggleCam = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(!isCamOn);
      }
    } else {
      setIsCamOn(!isCamOn);
    }
  };

  const copyLink = () => {
    const fullUrl = `${window.location.origin}/prejoin/${currentRoomId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterMeeting = async () => {
    if (!currentRoomId) return;
    try {
      await joinMeetingApi(currentRoomId, { displayName: userName || 'Guest' });
      navigate(`/meeting/${currentRoomId}`);
    } catch (err) {
      addToast(err.message || 'Failed to join meeting', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-14">
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        {/* Left Side: Camera Preview Box */}
        <div className="w-full lg:w-3/5 space-y-4 flex flex-col justify-between">
          <div className="relative aspect-video bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl">
            {isCamOn && !mediaError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-slate-400" />
                </div>
                <span className="text-sm font-medium">Camera turned off</span>
              </div>
            )}

            {/* Mic / Cam overlay controls */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-slate-800/80 shadow-2xl">
              <button
                onClick={toggleMic}
                className={`p-3 rounded-full transition-all duration-200 ${
                  isMicOn ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                }`}
                title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleCam}
                className={`p-3 rounded-full transition-all duration-200 ${
                  isCamOn ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                }`}
                title={isCamOn ? 'Turn Off Camera' : 'Turn On Camera'}
              >
                {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Device Settings"
              >
                <Sliders className="w-5 h-5" />
              </button>
            </div>
          </div>

          {mediaError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
              <span>{mediaError}</span>
            </div>
          )}
        </div>

        {/* Right Side: Setup Card & Action */}
        <div className="w-full lg:w-2/5">
          <Card className="h-full flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Pre-Join Lobby</span>
                <h2 className="text-2xl font-extrabold text-slate-100 mt-1">Ready to Connect?</h2>
                <p className="text-xs text-slate-400 mt-1">Check your settings before entering the call.</p>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1.5">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Room Code:</span>
                <div className="flex items-center justify-between text-sm font-mono font-bold text-slate-200">
                  <span>{currentRoomId}</span>
                  <button
                    onClick={copyLink}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 font-sans font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <Input
                label="Your Display Name"
                placeholder="e.g. Alex Rivera"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                icon={User}
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <Button onClick={handleEnterMeeting} className="w-full !py-3.5 text-base" icon={ArrowRight}>
                Join Meeting Now
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Encrypted P2P Connection</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Device Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
