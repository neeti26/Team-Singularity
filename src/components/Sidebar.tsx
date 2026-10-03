'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Upload, MessageSquare,
  CheckSquare, Scale, Bell, Zap, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    color: 'text-blue-400' },
  { href: '/upload',       icon: Upload,          label: 'Upload Docs',  color: 'text-violet-400' },
  { href: '/chat',         icon: MessageSquare,   label: 'Ask Singularity', color: 'text-cyan-400' },
  { href: '/action-items', icon: CheckSquare,     label: 'Action Items', color: 'text-green-400' },
  { href: '/decisions',    icon: Scale,           label: 'Decisions',    color: 'text-purple-400' },
  { href: '/nudges',       icon: Bell,            label: 'Nudges',       color: 'text-amber-400' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] shrink-0 h-full flex flex-col glass">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Singularity</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Org Memory AI</p>
          </div>
        </div>

        {/* Status pill */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl"
             style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-green-400 text-[10px] font-medium">Gemini 1.5 Pro · Live</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 mb-3" style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <p className="section-header px-3 mb-3">Menu</p>
        {NAV.map(({ href, icon: Icon, label, color }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={clsx('sidebar-link', active && 'active')}
            >
              <Icon className={clsx('w-4 h-4 shrink-0 transition-colors', active ? 'text-blue-300' : color)} />
              <span className="flex-1 text-[13px]">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mx-5 mt-2 mb-5">
        <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                 style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              TS
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">Team Singularity</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>AI Builder Cup 2026</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {['Gemini', 'Firestore', 'Cloud Run'].map(t => (
              <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded-md"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
