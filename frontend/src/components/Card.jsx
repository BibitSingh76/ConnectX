import React from 'react';

export const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/50 ${className}`}>
      {children}
    </div>
  );
};
