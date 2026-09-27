import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Plus,
  LogIn,
  Clock,
  Calendar,
  Users,
  Copy,
  Check,
  ArrowRight,
  Radio,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useMeeting } from '../context/MeetingContext';
import { generateRoomId } from '../utils/roomIdGenerator';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setRoomId } = useMeeting();

  const [metrics, setMetrics] = useState({
    totalMeetings: 0,
    activeCount: 0,
    totalDurationSeconds: 0,
    recentMeetings: [],
  });
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/meetings/summary`);
        if (response.ok) {
          const resData = await response.json();
          if (resData.success) {
            setMetrics(resData.data);
          }
        }
      } catch (err) {
        console.warn('Dashboard metrics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const handleCreateMeeting = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    navigate(`/prejoin/${newRoomId}`);
  };

  const handleJoinMeeting = () => {
    navigate('/join');
  };

  const copyRoomLink = (id) => {
    const fullUrl = `${window.location.origin}/prejoin/${id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0 mins';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs} hr ${mins % 60} mins`;
    }
    return `${mins} mins`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> ConnectX Workspace
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
            Welcome back, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">{user?.name || 'User'}</span>!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Host high-definition P2P meetings or join an ongoing conversation instantly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button onClick={handleCreateMeeting} className="w-full sm:w-auto" icon={Plus}>
            New Meeting
          </Button>
          <Button onClick={handleJoinMeeting} variant="secondary" className="w-full sm:w-auto" icon={LogIn}>
            Join Room
          </Button>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Meetings</span>
            <h3 className="text-2xl font-bold text-slate-100 mt-0.5">{metrics.totalMeetings}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3.5 bg-purple-600/20 border border-purple-500/30 rounded-2xl text-purple-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Call Time</span>
            <h3 className="text-2xl font-bold text-slate-100 mt-0.5">{formatDuration(metrics.totalDurationSeconds)}</h3>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Sessions</span>
            <h3 className="text-2xl font-bold text-slate-100 mt-0.5">{metrics.activeCount}</h3>
          </div>
        </Card>
      </div>

      {/* Recent Meetings Table */}
      <Card className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-100">Recent Meeting Sessions</h2>
          </div>
          <Button variant="outline" onClick={() => navigate('/my-meetings')} className="!py-1.5 !px-3 text-xs">
            View All History
          </Button>
        </div>

        {metrics.recentMeetings.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-300">No meeting history yet</p>
            <p className="text-xs text-slate-500 mt-1">Start your first call to see meeting logs here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Room ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {metrics.recentMeetings.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 flex items-center gap-2">
                      <span>{m.meetingId}</span>
                      <button
                        onClick={() => copyRoomLink(m.meetingId)}
                        className="text-slate-500 hover:text-slate-300"
                        title="Copy Room Link"
                      >
                        {copiedId === m.meetingId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{formatDuration(m.duration)}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-semibold text-[10px] uppercase tracking-wider border ${
                          m.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => navigate(`/prejoin/${m.meetingId}`)}
                        className="!py-1 !px-3 text-[11px]"
                        icon={ArrowRight}
                      >
                        {m.status === 'active' ? 'Join Call' : 'Reopen'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
