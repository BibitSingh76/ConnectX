import React from 'react';

export const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  className = '',
  icon: Icon,
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{label}</label>}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full rounded-xl bg-slate-900 border ${
            error ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-700/80 focus:ring-indigo-500 focus:border-indigo-500'
          } ${Icon ? 'pl-10' : 'px-4'} py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 transition duration-200 ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </div>
  );
};
