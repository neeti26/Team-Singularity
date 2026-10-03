'use client';

import { useEffect, useState } from 'react';
import {
  FileText, Scale, CheckSquare, AlertTriangle,
  TrendingUp, Activity, Bell, ArrowRight,
} from 'lucide-react';
import Link    from 'next/link';
import StatCard from '@/components/StatCard';
import type { OrgStats } from '@/types';

const ACTIVITY_ICON: Record<string, string> = {
  document_uploaded:    '📄',
  decision_extracted:   '⚖️',
  action_item_created:  '✅',
  nudge_sent:           '🔔',
};

export default function DashboardPage() {
  const [stats,   setStats]   = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((j) => { if (j.success) setStats(j.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Org Intelligence Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">
          Your organisation's memory — decisions, tasks, and context, always at hand.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Documents"
          value={stats?.totalDocuments ?? 0}
          icon={FileText}
          color="blue"
          trend={loading ? undefined : `${stats?.documentsThisWeek ?? 0} this week`}
          trendUp={(stats?.documentsThisWeek ?? 0) > 0}
          loading={loading}
        />
        <StatCard
          label="Decisions"
          value={stats?.totalDecisions ?? 0}
          icon={Scale}
          color="purple"
          loading={loading}
        />
        <StatCard
          label="Action Items"
          value={stats?.totalActionItems ?? 0}
          icon={CheckSquare}
          color="green"
          loading={loading}
        />
        <StatCard
          label="Open Tasks"
          value={stats?.openActionItems ?? 0}
          icon={Activity}
          color="amber"
          loading={loading}
        />
        <StatCard
          label="Overdue"
          value={stats?.overdueActionItems ?? 0}
          icon={AlertTriangle}
          color="red"
          trend={loading ? undefined : (stats?.overdueActionItems ?? 0) > 0 ? 'Needs attention' : 'All clear'}
          trendUp={false}
          loading={loading}
        />
        <StatCard
          label="This Week"
          value={stats?.documentsThisWeek ?? 0}
          icon={TrendingUp}
          color="green"
          loading={loading}
        />
      </div>

      {/* Two column layout */}
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
              <p className="text-slate-500 text-sm">No activity yet.</p>
              <Link href="/upload" className="text-blue-400 text-sm mt-2 inline-flex items-center gap-1 hover:text-blue-300">
                Upload your first document <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((event) => (
                <div key={event.id} className="flex items-start gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-sm shrink-0">
                    {ACTIVITY_ICON[event.type] || '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm">{event.description}</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { href: '/upload',       icon: FileText,    label: 'Upload Document',       sub: 'PDF, DOCX, TXT, Slack' },
                { href: '/chat',         icon: Bell,        label: 'Ask TeamPulse',         sub: 'Q&A your knowledge base' },
                { href: '/action-items', icon: CheckSquare, label: 'Review Action Items',   sub: `${stats?.openActionItems ?? '—'} open tasks` },
                { href: '/decisions',    icon: Scale,       label: 'Browse Decisions',      sub: `${stats?.totalDecisions ?? '—'} recorded` },
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
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Overdue alert */}
          {(stats?.overdueActionItems ?? 0) > 0 && (
            <div className="card p-4 border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-medium text-sm">
                    {stats!.overdueActionItems} overdue task{stats!.overdueActionItems > 1 ? 's' : ''}
                  </p>
                  <p className="text-red-400/70 text-xs mt-0.5">
                    Run the Nudge Agent to alert assignees.
                  </p>
                  <Link href="/action-items" className="text-red-300 text-xs mt-2 inline-flex items-center gap-1 hover:text-red-200">
                    View tasks <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Architecture callout — for judges */}
      <div className="card p-6 border-blue-500/20 bg-blue-500/5">
        <h3 className="text-blue-300 font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="text-base">⚡</span> Multi-Agent Architecture (Gemini 1.5 Pro)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: 'Ingestion Agent',  desc: 'Chunks & embeds documents using text-embedding-004' },
            { name: 'Extraction Agent', desc: 'Pulls decisions & action items via structured prompting' },
            { name: 'QA Agent',         desc: 'RAG pipeline: semantic search + Gemini synthesis' },
            { name: 'Nudge Agent',      desc: 'Generates human nudge messages for overdue tasks' },
          ].map((a) => (
            <div key={a.name} className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <p className="text-blue-200 font-medium text-xs">{a.name}</p>
              <p className="text-blue-300/60 text-xs mt-1">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
