'use client';

import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label:       string;
  value:       string | number;
  icon:        LucideIcon;
  trend?:      string;
  trendUp?:    boolean;
  color?:      'blue' | 'green' | 'amber' | 'red' | 'purple';
  loading?:    boolean;
}

const COLOR_MAP = {
  blue:   'text-blue-400   bg-blue-500/10   border-blue-500/20',
  green:  'text-green-400  bg-green-500/10  border-green-500/20',
  amber:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
  red:    'text-red-400    bg-red-500/10    border-red-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function StatCard({
  label, value, icon: Icon, trend, trendUp, color = 'blue', loading,
}: Props) {
  const colorClass = COLOR_MAP[color];

  if (loading) {
    return (
      <div className="card p-5">
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-8 w-16 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="card p-5 hover:border-slate-500 transition-colors duration-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        <div className={clsx('p-2 rounded-lg border', colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-white text-3xl font-bold tabular-nums">{value}</p>
      {trend && (
        <p className={clsx('text-xs mt-1.5', trendUp ? 'text-green-400' : 'text-slate-500')}>
          {trend}
        </p>
      )}
    </div>
  );
}
