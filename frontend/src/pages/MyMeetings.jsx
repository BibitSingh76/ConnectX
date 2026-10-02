import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Calendar, Copy, Check, ArrowRight, Search, Filter } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { TableSkeleton } from '../components/states/Skeleton';
import { EmptyState } from '../components/states/EmptyState';
import { listMeetingsApi } from '../services/apiService';

export const MyMeetings = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMeetings = async () => {
      try {
        const resData = await listMeetingsApi(filterStatus);
        if (isMounted && resData?.success) {
          setMeetings(resData.meetings || []);
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Fetch meetings error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMeetings();
    return () => {
      isMounted = false;
    };
  }, [filterStatus]);

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

  const filteredMeetings = useMemo(() => {
    return meetings.filter(
      (m) =>
        m.meetingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [meetings, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100">Meeting History</h1>
          <p className="text-xs text-slate-400 mt-1">Review past call sessions, durations, and participant logs.</p>
        </div>
        <Button onClick={() => navigate('/dashboard')} variant="secondary" icon={Video}>
          Back to Dashboard
        </Button>
      </div>

      <Card className="space-y-6">
        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by Room ID or Title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={Search}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Sessions</option>
              <option value="active">Active Sessions</option>
              <option value="ended">Ended Sessions</option>
            </select>
          </div>
        </div>

        {/* Meetings List */}
        {loading ? (
          <TableSkeleton />
        ) : filteredMeetings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No meeting records found"
            description="Try adjusting your search query or status filter, or host a new meeting session."
            actionLabel="Create Meeting"
            onAction={() => navigate('/dashboard')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Room ID</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Participants</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredMeetings.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 flex items-center gap-2">
                      <span>{m.meetingId}</span>
                      <button
                        onClick={() => copyRoomLink(m.meetingId)}
                        className="text-slate-500 hover:text-slate-300"
                        title="Copy Invite Link"
                      >
                        {copiedId === m.meetingId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {new Date(m.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{formatDuration(m.duration)}</td>
                    <td className="py-3.5 px-4 text-slate-300">{m.participants ? m.participants.length : 1} Users</td>
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
