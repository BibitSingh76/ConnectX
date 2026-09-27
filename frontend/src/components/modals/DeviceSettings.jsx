import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Mic, Volume2, Sliders, ShieldCheck, Check, Activity } from 'lucide-react';
import { Button } from '../Button';

export const DeviceSettings = ({
  isOpen,
  onClose,
  devices = { videoInputs: [], audioInputs: [], audioOutputs: [] },
  onSwitchCamera,
  onSwitchMicrophone,
  onSwitchSpeaker,
  remoteVideoRef,
}) => {
  const [selectedCam, setSelectedCam] = useState('default');
  const [selectedMic, setSelectedMic] = useState('default');
  const [selectedSpeaker, setSelectedSpeaker] = useState('default');
  const [audioLevel, setAudioLevel] = useState(0);

  const previewVideoRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // Enumerate devices & initialize audio level meter
  useEffect(() => {
    if (!isOpen) return;

    let localTestStream = null;

    const setupTestAudioMeter = async () => {
      try {
        localTestStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = localTestStream;
        }

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;

          const source = audioCtx.createMediaStreamSource(localTestStream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
        }
      } catch (err) {
        console.warn('[DeviceSettings] Test media stream initialization error:', err);
      }
    };

    setupTestAudioMeter();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (localTestStream) {
        localTestStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCamChange = (e) => {
    const devId = e.target.value;
    setSelectedCam(devId);
    if (onSwitchCamera && devId !== 'default') {
      onSwitchCamera(devId);
    }
  };

  const handleMicChange = (e) => {
    const devId = e.target.value;
    setSelectedMic(devId);
    if (onSwitchMicrophone && devId !== 'default') {
      onSwitchMicrophone(devId);
    }
  };

  const handleSpeakerChange = (e) => {
    const devId = e.target.value;
    setSelectedSpeaker(devId);
    if (onSwitchSpeaker && remoteVideoRef && remoteVideoRef.current && devId !== 'default') {
      onSwitchSpeaker(remoteVideoRef.current, devId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Professional Device Management</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition"
            aria-label="Close Device Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Live Preview Box */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" /> Video & Microphone Test
            </span>
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Audio Level Visualizer Overlay */}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
                <Activity className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-slate-300 min-w-16">Mic Level:</span>
                <div className="flex-1 bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 h-full transition-all duration-75"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Camera Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" /> Camera Source
            </label>
            <select
              value={selectedCam}
              onChange={handleCamChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="default">Default Integrated Camera</option>
              {devices.videoInputs &&
                devices.videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera Source (${d.deviceId.slice(0, 8)}...)`}
                  </option>
                ))}
            </select>
          </div>

          {/* Microphone Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-400" /> Microphone Input
            </label>
            <select
              value={selectedMic}
              onChange={handleMicChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="default">Default Microphone Input</option>
              {devices.audioInputs &&
                devices.audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone Input (${d.deviceId.slice(0, 8)}...)`}
                  </option>
                ))}
            </select>
          </div>

          {/* Audio Output Speaker Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" /> Audio Output (Speaker)
            </label>
            <select
              value={selectedSpeaker}
              onChange={handleSpeakerChange}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="default">Default System Audio Output</option>
              {devices.audioOutputs &&
                devices.audioOutputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Speaker Output (${d.deviceId.slice(0, 8)}...)`}
                  </option>
                ))}
            </select>
          </div>

          {/* Info Badge */}
          <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-indigo-300 text-xs">
            <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <span>Device track replacement uses RTCRtpSender.replaceTrack() without breaking WebRTC peer connections.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex justify-end gap-3">
          <Button variant="primary" onClick={onClose} icon={Check}>
            Done & Save
          </Button>
        </div>
      </div>
    </div>
  );
};
