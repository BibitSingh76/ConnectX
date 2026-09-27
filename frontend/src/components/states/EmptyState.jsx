import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '../Button';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'There are no active items to display at the moment.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-md max-w-md mx-auto my-6">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/5">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-slate-100 dark:text-slate-100">{title}</h3>
      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
