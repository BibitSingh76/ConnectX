import React, { useState } from 'react';
import { User, Mail, Shield, Calendar, Check, Save } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';

export const Profile = () => {
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100">User Profile</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your account information and preferences.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <Card className="md:col-span-1 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border-2 border-indigo-500/40 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-xl">
            {name ? name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">{name || 'User'}</h3>
            <p className="text-xs text-slate-400">{email || 'user@example.com'}</p>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-indigo-400" /> Account Type</span>
              <span className="font-semibold text-slate-200">Verified User</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-400" /> Joined Date</span>
              <span className="font-semibold text-slate-200">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' }) : 'Recent'}
              </span>
            </div>
          </div>
        </Card>

        {/* Profile Edit Form */}
        <Card className="md:col-span-2 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-slate-100">Account Details</h2>
            <p className="text-xs text-slate-400">Update your public display name and registered email.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={User}
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <div className="pt-4 flex items-center justify-end gap-3">
              {saved && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Profile Updated!
                </span>
              )}
              <Button type="submit" icon={Save}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
