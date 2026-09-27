import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Connecting to room...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <Loader2 className="w-6 h-6 text-indigo-400 absolute animate-pulse" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-300 animate-pulse">{message}</p>
    </div>
  );
};
