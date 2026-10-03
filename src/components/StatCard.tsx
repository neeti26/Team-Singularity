'use client';

import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface Props {
  label:    string;
  value:    string | number;
  icon:     LucideIcon;
  trend?:   string;
  trendUp?: boolean;
  color?:   'blue' | 'green' | 'amber' | 'red' | 'purple';
  loading?: boolean;
}

const THEME = {
  blue:   { icon: 'text-blue-400',   ring: 'rgba(59,130,246,0.25)',  bg: 'rgba(59,130,246,0.08)',  glow: 'rgba(59,130,246,0.12)',  num: '#93c5fd' },
  green:  { icon: 'text-green-400',  ring: 'rgba(16,185,129,0.25)',  bg: 'rgba(16,185,129,0.08)',  glow: 'rgba(16,185,129,0.12)',  num: '#6ee7b7' },
  amber:  { icon: 'text-amber-400',  ring: 'rgba(245,158,11,0.25)',  bg: 'rgba(245,158,11,0.08)',  glow: 'rgba(245,158,11,0.12)',  num: '#fcd34d' },
  red:    { icon: 'text-red-400',    ring: 'rgba(239,68,68,0.25)',   bg: 'rgba(239,68,68,0.08)',   glow: 'rgba(239,68,68,0.12)',   num: '#fca5a5' },
  purple: { icon: 'text-purple-400', ring: 'rgba(168,85,247,0.25)',  bg: 'rgba(168,85,247,0.08)',  glow: 'rgba(168,85,247,0.12)',  num: '#d8b4fe' },
};

export default function StatCard({ label, value, icon: Icon, trend, trendUp, color = 'blue', loading }: Props) {
  const t = THEME[color];

  if (loading) {
    return (
      <div className="card p-5 min-h-[100px]">
        <div className="skeleton h-3 w-20 mb-4 rounded-md" />
        <div className="skeleton h-7 w-14 mb-2.5 rounded-md" />
        <div className="skeleton h-2.5 w-16 rounded-md" />
      </div>
    );
  }

  return (
    <div className="card p-5 stat-card-inner cursor-default group"
         style={{ ['--glow' as string]: t.glow }}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
             style={{ background: t.bg, boxShadow: `0 0 0 1px ${t.ring}` }}>
          <Icon className={clsx('w-4 h-4', t.icon)} />
        </div>
      </div>

      <p className="text-3xl font-bold tabular-nums leading-none transition-all group-hover:scale-105 origin-left"
         style={{ color: t.num }}>
        {value}
      </p>

      {trend && (
        <p className={clsx('text-[11px] mt-2.5 font-medium', trendUp ? 'text-green-400' : 'text-white/25')}>
          {trend}
        </p>
      )}
    </div>
  );
}
