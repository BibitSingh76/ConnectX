import React, { useState } from 'react';
import { Camera, Mic, Bell, Shield, Sliders, Check } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const Settings = () => {
  const [notifications, setNotifications] = useState({
    meetingReminders: true,
    soundAlerts: true,
    emailSummaries: false,
  });

  const [saved, setSaved] = useState(false);

  const toggleNotification = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100">Application Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Customize audio/video devices and notification alerts.</p>
      </div>

      <div className="space-y-6">

        {/* Media Devices Preferences */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Camera className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">Default Media Devices</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" /> Preferred Camera
              </label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="default">Default Integrated Web Camera</option>
                <option value="virtual">Virtual Camera Input</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-400" /> Preferred Microphone
              </label>
              <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="default">Default Built-in Microphone Array</option>
                <option value="external">External USB Microphone</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bell className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-slate-100">Notification Alerts</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
              <div>
                <h3 className="text-xs font-bold text-slate-200">In-Call Sound Alerts</h3>
                <p className="text-[11px] text-slate-400">Play chime when participants join or leave call</p>
              </div>
              <button
                onClick={() => toggleNotification('soundAlerts')}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  notifications.soundAlerts ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-2xl">
              <div>
                <h3 className="text-xs font-bold text-slate-200">Meeting Reminders</h3>
                <p className="text-[11px] text-slate-400">Show desktop alert before scheduled call starts</p>
              </div>
              <button
                onClick={() => toggleNotification('meetingReminders')}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  notifications.meetingReminders ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            {saved && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Preferences Saved!
              </span>
            )}
            <Button onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
