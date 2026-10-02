import React, { useMemo } from 'react';
import { X, Users, Mic, MicOff, Video, VideoOff, ShieldCheck } from 'lucide-react';

export const ParticipantsPanel = React.memo(({
  isOpen,
  onClose,
  participants = [],
  currentUserName,
  isMicOn,
  isCamOn,
}) => {
  // Build reactive participant list including local and active remote peers
  const activeParticipants = useMemo(
    () => [
      {
        id: 'local',
        name: `${currentUserName || 'You'} (Host)`,
        isLocal: true,
        micOn: isMicOn,
        camOn: isCamOn,
        status: 'Connected',
      },
      ...participants.map((p) => ({
        id: p.socketId || p.id,
        name: p.name || 'Remote Peer',
        isLocal: false,
        micOn: p.isMicOn !== undefined ? p.isMicOn : true,
        camOn: p.isCamOn !== undefined ? p.isCamOn : true,
        status: 'Connected',
      })),
    ],
    [currentUserName, isMicOn, isCamOn, participants]
  );

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 md:relative md:inset-auto w-full md:w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl z-30 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm">
            Participants ({activeParticipants.length})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          aria-label="Close Participants Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Participants List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2.5">
        {activeParticipants.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-extrabold text-xs shadow-md">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">{user.name}</span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> {user.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              {user.micOn ? (
                <Mic className="w-4 h-4 text-emerald-400" />
              ) : (
                <MicOff className="w-4 h-4 text-rose-400" />
              )}
              {user.camOn ? (
                <Video className="w-4 h-4 text-emerald-400" />
              ) : (
                <VideoOff className="w-4 h-4 text-rose-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
