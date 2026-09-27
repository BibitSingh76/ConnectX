import React from 'react';

export const Skeleton = ({ className = '' }) => {
  return (
    <div
      className={`bg-slate-800/60 animate-pulse rounded-xl ${className}`}
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
      <Skeleton className="w-12 h-12 rounded-2xl" />
      <Skeleton className="w-3/4 h-5" />
      <Skeleton className="w-1/2 h-4" />
    </div>
  );
};

export const TableSkeleton = () => {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-800/50">
          <Skeleton className="w-1/4 h-4" />
          <Skeleton className="w-1/4 h-4" />
          <Skeleton className="w-1/6 h-4" />
          <Skeleton className="w-16 h-8 rounded-xl" />
        </div>
      ))}
    </div>
  );
};
