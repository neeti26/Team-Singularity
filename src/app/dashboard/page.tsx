'use client';

import { useEffect, useState, useRef } from 'react';
import {
  FileText, Scale, CheckSquare, AlertTriangle,
  TrendingUp, Activity, Bell, ArrowRight,
  Brain, Search, Sparkles, Zap, Database,
} from 'lucide-react';
import Link     from 'next/link';
import StatCard from '@/components/StatCard';
import type { OrgStats } from '@/types';

const ACTIVITY_ICON: Record<string, string> = {
  document_uploaded:   '📄',
  decision_extracted:  '⚖️',
  action_item_created: '✅',
  nudge_sent:          '🔔',
};

// ── Animated pipeline diagram ─────────────────────────────────
const AGENTS = [
  { icon: FileText, name: 'Ingestion',  color: 'blue',   desc: 'text-embedding-004',         node: 0 },
  { icon: Brain,    name: 'Extraction', color: 'purple',  desc: 'Gemini 1.5 Pro',             node: 1 },
  { icon: Search,   name: 'QA / RAG',   color: 'cyan',    desc: 'Semantic search + synthesis', node: 2 },
  { icon: Bell,     name: 'Nudge',      color: 'amber',   desc: 'Flash · human reminders',    node: 3 },
];

const COLOR: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', dot: 'bg-purple-400' },
  cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-300',   dot: 'bg-cyan-400' },
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-300',  dot: 'bg-amber-400' },
};

function AgentPipeline() {
  const [activeNode, setActiveNode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveNode((n) => (n + 1) % AGENTS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card p-5 border-blue-500/20 bg-blue-500/5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-blue-400" />
        <h3 className="text-blue-200 font-semibold text-sm">
          Live Multi-Agent Pipeline — Gemini 1.5 Pro
        </h3>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-[10px]">Active</span>
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="flex items-center gap-1 sm:gap-2">
        {AGENTS.map(({ icon: Icon, name, color, desc }, i) => {
          const c = COLOR[color];
          const isActive = activeNode === i;
          return (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <div className={`flex-1 rounded-xl p-3 border transition-all duration-500 ${c.border}
                ${isActive ? `${c.bg} shadow-lg scale-105` : 'bg-slate-800/40 border-slate-700/50 opacity-60'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isActive ? `${c.dot} shadow-[0_0_6px_currentColor]` : 'bg-slate-600'}`} />
                  <Icon className={`w-3.5 h-3.5 transition-colors duration-300 ${isActive ? c.text : 'text-slate-600'}`} />
                </div>
                <p className={`text-[11px] font-semibold transition-colors duration-300 ${isActive ? c.text : 'text-slate-600'}`}>
                  {name}
                </p>
                <p className={`text-[9px] mt-0.5 transition-colors duration-300 ${isActive ? 'text-slate-400' : 'text-slate-700'}`}>
                  {desc}
                </p>
              </div>
              {i < AGENTS.length - 1 && (
                <div className={`w-4 sm:w-6 flex items-center justify-center shrink-0 transition-all duration-300
                  ${activeNode > i ? 'text-green-400' : 'text-slate-700'}`}>
                  <span className="text-base">→</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Storage row */}
      <div className="mt-3 flex items-center gap-2 px-2 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <div className="flex gap-3 flex-wrap">
          {['documents', 'chunks', 'embeddings', 'decisions', 'actionItems', 'chatSessions', 'nudgeLogs'].map((col) => (
            <span key={col} className="text-slate-600 text-[10px] font-mono">{col}</span>
          ))}
        </div>
        <span className="ml-auto text-slate-600 text-[10px]">Firestore</span>
      </div>
    </div>
  );
}

// ── Completion health bar ─────────────────────────────────────
function HealthBar({ stats }: { stats: OrgStats | null }) {
  if (!stats) return null;
  const total = stats.totalActionItems;
  const done  = total - stats.openActionItems - stats.overdueActionItems;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400">Task completion rate</span>
          <span className="text-white font-semibold">{pct}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-white font-bold text-lg">{done}<span className="text-slate-500 text-sm font-normal">/{total}</span></p>
        <p className="text-slate-500 text-xs">tasks done</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats,   setStats]   = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = () => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((j) => { if (j.success) setStats(j.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh every 30 s
    const id = setInterval(loadStats, 30_000);
    return () => clearInterval(id);
  }, []);

  const STAT_CARDS = [
    { label: 'Documents',    value: stats?.totalDocuments ?? 0,    icon: FileText,    color: 'blue'   as const, trend: `${stats?.documentsThisWeek ?? 0} this week`, trendUp: (stats?.documentsThisWeek ?? 0) > 0 },
    { label: 'Decisions',    value: stats?.totalDecisions ?? 0,    icon: Scale,       color: 'purple' as const, trend: undefined, trendUp: false },
    { label: 'Action Items', value: stats?.totalActionItems ?? 0,  icon: CheckSquare, color: 'green'  as const, trend: undefined, trendUp: false },
    { label: 'Open Tasks',   value: stats?.openActionItems ?? 0,   icon: Activity,    color: 'amber'  as const, trend: undefined, trendUp: false },
    { label: 'Overdue',      value: stats?.overdueActionItems ?? 0, icon: AlertTriangle, color: 'red' as const, trend: (stats?.overdueActionItems ?? 0) > 0 ? '⚠ Needs attention' : '✓ All clear', trendUp: false },
    { label: 'This Week',    value: stats?.documentsThisWeek ?? 0, icon: TrendingUp,  color: 'green'  as const, trend: undefined, trendUp: false },
  ];

  const staggerClass = ['', 'animate-slide-up-1', 'animate-slide-up-2', 'animate-slide-up-3', 'animate-slide-up-4', 'animate-slide-up-5'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Org Intelligence Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Your organisation's memory — decisions, tasks, and context, always at hand.
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-600 text-xs">Auto-refreshes every 30s</p>
          <div className="flex items-center gap-1 justify-end mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs">Live</span>
          </div>
        </div>
      </div>

      {/* Stats grid — staggered entrance */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAT_CARDS.map((card, i) => (
          <div key={card.label} className={`animate-slide-up ${staggerClass[i]}`}>
            <StatCard {...card} loading={loading} />
          </div>
        ))}
      </div>

      {/* Health bar */}
      {!loading && <HealthBar stats={stats} />}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Recent Activity
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5 py-1">
                    <div className="skeleton h-3 w-3/4" />
                    <div className="skeleton h-2 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : !stats?.recentActivity?.length ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-slate-700 mx-auto mb-3 animate-float" />
              <p className="text-slate-500 text-sm">No activity yet.</p>
              <Link href="/upload" className="text-blue-400 text-sm mt-2 inline-flex items-center gap-1 hover:text-blue-300">
                Upload your first document <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700/50" />
              <div className="space-y-4 pl-2">
                {stats.recentActivity.map((event, i) => (
                  <div key={event.id} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-sm shrink-0 z-10">
                      {ACTIVITY_ICON[event.type] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-slate-300 text-sm">{event.description}</p>
                      <p className="text-slate-600 text-xs mt-0.5">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/upload',       icon: FileText,    label: 'Upload Document',    sub: 'PDF, DOCX, TXT, Slack' },
                { href: '/chat',         icon: Sparkles,    label: 'Ask Singularity AI', sub: 'Q&A your knowledge base' },
                { href: '/action-items', icon: CheckSquare, label: 'Action Items',        sub: `${stats?.openActionItems ?? '—'} open tasks` },
                { href: '/decisions',    icon: Scale,       label: 'Browse Decisions',   sub: `${stats?.totalDecisions ?? '—'} recorded` },
              ].map(({ href, icon: Icon, label, sub }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5
                             border border-transparent hover:border-slate-700 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium">{label}</p>
                    <p className="text-slate-500 text-xs">{sub}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Overdue alert */}
          {(stats?.overdueActionItems ?? 0) > 0 && (
            <div className="card p-4 border-red-500/30 bg-red-500/5 animate-slide-up">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium text-sm">
                    {stats!.overdueActionItems} overdue task{stats!.overdueActionItems > 1 ? 's' : ''}
                  </p>
                  <p className="text-red-400/70 text-xs mt-0.5">
                    Run the Nudge Agent to alert assignees.
                  </p>
                  <Link href="/nudges" className="text-red-300 text-xs mt-2 inline-flex items-center gap-1 hover:text-red-200">
                    Run Nudge Agent <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animated agent pipeline */}
      <AgentPipeline />
    </div>
  );
}
