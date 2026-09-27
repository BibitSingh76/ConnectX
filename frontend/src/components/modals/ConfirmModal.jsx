import React from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '../Button';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-500/5">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-slate-100">{title || 'Leave Meeting?'}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {message || 'Are you sure you want to leave this call? You can rejoin anytime using the room code.'}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} className="w-1/2">
            Stay in Call
          </Button>
          <Button variant="danger" onClick={onConfirm} className="w-1/2" icon={LogOut}>
            Leave Call
          </Button>
        </div>
      </div>
    </div>
  );
};
