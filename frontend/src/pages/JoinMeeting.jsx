import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useMeeting } from '../context/MeetingContext';

export const JoinMeeting = () => {
  const navigate = useNavigate();
  const { setRoomId, setUserName } = useMeeting();
  
  const [inputRoomId, setInputRoomId] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (!inputRoomId.trim()) {
      setError('Please enter a valid room code or invite link.');
      return;
    }

    let cleanId = inputRoomId.trim();
    if (cleanId.includes('/')) {
      cleanId = cleanId.split('/').pop();
    }

    setRoomId(cleanId);
    if (name.trim()) setUserName(name.trim());

    navigate(`/prejoin/${cleanId}`);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <Card className="shadow-2xl border-slate-800">
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-600/30">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Join a ConnectX Call</h2>
          <p className="text-xs text-slate-400">Enter the room code or invitation link to connect.</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          <Input
            label="Room Code or Invite Link"
            placeholder="e.g. room-abc-123"
            value={inputRoomId}
            onChange={(e) => {
              setInputRoomId(e.target.value);
              setError('');
            }}
            icon={Key}
            error={error}
          />

          <Input
            label="Display Name (Optional)"
            placeholder="e.g. Sarah Jenkins"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={User}
          />

          <div className="pt-2 space-y-3">
            <Button type="submit" className="w-full" icon={ArrowRight}>
              Continue to Pre-Join
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full border-slate-800"
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-slate-500 text-[11px] justify-center">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
          <span>Maximum 2 participants allowed per session.</span>
        </div>
      </Card>
    </div>
  );
};
