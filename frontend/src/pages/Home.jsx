import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Plus, LogIn, Shield, Zap, Lock, Sparkles, Monitor, Users, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { generateRoomId } from '../utils/roomIdGenerator';
import { createMeetingApi } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { useMeeting } from '../context/MeetingContext';

export const Home = () => {
  const navigate = useNavigate();
  const { setRoomId, userName } = useMeeting();
  const { addToast } = useToast();

  const handleCreateMeeting = async () => {
    try {
      const newRoomId = generateRoomId();
      const res = await createMeetingApi({
        meetingId: newRoomId,
        title: 'ConnectX Instant Meeting',
        hostName: userName || 'Host',
      });
      const persistedId = res.data?.meetingId || newRoomId;
      setRoomId(persistedId);
      navigate(`/prejoin/${persistedId}`);
    } catch (err) {
      addToast(err.message || 'Failed to create meeting', 'error');
    }
  };

  const handleJoinMeeting = () => {
    navigate('/join');
  };

  const features = [
    {
      icon: Lock,
      title: 'Peer-to-Peer Privacy',
      description: 'Your media stream travels directly between participants via WebRTC encryption.',
    },
    {
      icon: Zap,
      title: 'Sub-100ms Latency',
      description: 'Ultra-fast Socket.io signaling delivers real-time audio and video sync.',
    },
    {
      icon: Monitor,
      title: 'HD Screen Share',
      description: 'Present high-definition presentations, browser tabs, or code windows seamlessly.',
    },
    {
      icon: Users,
      title: 'Authoritative 1:1 Rooms',
      description: 'Strict participant caps prevent unwanted room crashers or duplicate entries.',
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider shadow-lg shadow-indigo-500/5 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen P2P Video Communication
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-100 leading-[1.1]">
            Seamless 1:1 Video Calls with{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              ConnectX
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Experience ultra-private, high-definition video conferencing directly inside your browser. No downloads or accounts required.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              onClick={handleCreateMeeting}
              className="w-full sm:w-auto text-base !px-8 !py-4 shadow-xl shadow-indigo-600/30"
              icon={Plus}
            >
              Create New Meeting
            </Button>

            <Button
              onClick={handleJoinMeeting}
              variant="secondary"
              className="w-full sm:w-auto text-base !px-8 !py-4 border-slate-700/80"
              icon={LogIn}
            >
              Join Existing Room
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">Architected for Speed & Security</h2>
            <p className="text-slate-400 text-sm mt-2">Everything you need for seamless pair programming or private consulting.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((item, idx) => (
              <Card key={idx} className="hover:border-indigo-500/40 hover:-translate-y-1 transition duration-300">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Trust & Quality Badges */}
        <div className="mt-20 border-t border-slate-800/80 pt-10 flex flex-wrap items-center justify-between gap-6 text-slate-400 text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Zero Server Media Storage</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Cross-Platform WebRTC Standard</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Responsive Mobile & Desktop Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};
