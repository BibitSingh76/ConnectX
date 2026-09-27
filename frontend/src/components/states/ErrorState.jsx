import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../Button';

export const ErrorState = ({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again or return home.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-950/20 border border-rose-500/20 rounded-2xl max-w-md mx-auto my-6 backdrop-blur-md">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/5">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed mb-6">{description}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="danger">
          Try Again
        </Button>
      )}
    </div>
  );
};
