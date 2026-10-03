'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  CheckSquare,
  Scale,
  Bell,
  Zap,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { href: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/upload',         icon: Upload,          label: 'Upload Docs' },
  { href: '/chat',           icon: MessageSquare,   label: 'Ask TeamPulse' },
  { href: '/action-items',   icon: CheckSquare,     label: 'Action Items' },
  { href: '/decisions',      icon: Scale,           label: 'Decisions' },
  { href: '/nudges',         icon: Bell,            label: 'Nudges' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 h-full flex flex-col bg-[#0d1526] border-r border-slate-800">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">TeamPulse</p>
          <p className="text-slate-500 text-xs mt-0.5">Org Memory AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-slate-600 text-[10px] uppercase tracking-widest font-semibold px-3 mb-2">
          Navigation
        </p>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'sidebar-link group',
                active && 'active'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
            T
          </div>
          <div className="min-w-0">
            <p className="text-slate-300 text-xs font-medium truncate">Team Singularity</p>
            <p className="text-slate-600 text-[10px]">AI Builder Cup 2026</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-slate-500 text-[10px]">Gemini 1.5 Pro · Cloud Run</span>
        </div>
      </div>
    </aside>
  );
}
