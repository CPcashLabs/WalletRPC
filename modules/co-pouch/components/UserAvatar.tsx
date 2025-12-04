
import React from 'react';

export const UserAvatar = ({ address, idx, size = 'md' }: { address: string, idx: number, size?: 'sm' | 'md' | 'lg' }) => {
  const colors = [
    'bg-rose-100 text-rose-600', 
    'bg-indigo-100 text-indigo-600', 
    'bg-emerald-100 text-emerald-600', 
    'bg-amber-100 text-amber-600', 
    'bg-cyan-100 text-cyan-600'
  ];
  const color = colors[idx % colors.length];
  
  const sizeClasses = {
    sm: "w-6 h-6 text-[9px]",
    md: "w-9 h-9 text-xs border-2",
    lg: "w-12 h-12 text-sm border-2"
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full ${color} border-white flex items-center justify-center font-bold shadow-sm ring-1 ring-black/5`}>
      {address.slice(2, 4).toUpperCase()}
    </div>
  );
};
