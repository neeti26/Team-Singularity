'use client';

import { useState, useEffect } from 'react';
import { Bell, Zap, RefreshCw, AlertTriangle, Clock, CheckCircle, Users, Search } from 'lucide-react';
import type { NudgeMessage } from '@/agents/nudge-agent';
import clsx from 'clsx';

const URGENCY_COLOR: Record<string, string> = {
  critical: 'border-red-500/40 bg-red-500/5',
  high:     'border-orange-500/40 bg-orange-500/5',
  medium:   'border-yellow-500/30 bg-yellow-500/5',
  low:      'border-slate-700',
};

const URGENCY_BADGE: Record<string, string> = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
};

const URGENCY_DOTS: Record<string, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

// ── 3-stage agent run animation ───────────────────────────────
const RUN_STAGES = [
  { icon: Search,    label: 'Scanning open action items…' },
  { icon: AlertTriangle, label: 'Identifying overdue & at-risk tasks…' },
  { icon: Zap,       label: 'Generating nudge messages with Gemini…' },
];

function AgentRunAnimation({ stage }: { stage: number }) {
  return (
    <div className="space-y-2 mt-3">
      {RUN_STAGES.map(({ icon: Icon, label }, i) => {
        const isDone   = stage > i;
        const isActive = stage === i;
        return (
          <div key={i} className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500',
            isDone   && 'bg-green-500/5 border border-green-500/20',
            isActive && 'bg-blue-500/10 border border-blue-500/30',
            !isDone && !isActive && 'opacity-30',
          )}>
            <div className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-500',
              isDone   && 'bg-green-500/20',
              isActive && 'bg-blue-500/20',
            )}>
              <Icon className={clsx(
                'w-3 h-3 transition-colors',
                isDone   && 'text-green-400',
                isActive && 'text-blue-400 animate-pulse',
                !isDone && !isActive && 'text-slate-600',
              )} />
            </div>
            <span className={clsx(
              'text-xs transition-colors duration-300',
              isDone   && 'text-green-400',
              isActive && 'text-blue-300 font-medium',
              !isDone && !isActive && 'text-slate-600',
            )}>
              {label}
            </span>
            {isActive && (
              <span className="flex gap-1 ml-auto">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            )}
            {isDone && <CheckCircle className="w-3 h-3 text-green-400 ml-auto" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Urgency dots meter ────────────────────────────────────────
function UrgencyMeter({ level }: { level: string }) {
  const filled = URGENCY_DOTS[level] ?? 1;
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4].map((i) => (
        <div key={i} className={clsx(
          'w-1.5 h-1.5 rounded-full transition-all',
          i <= filled
            ? level === 'critical' ? 'bg-red-400' : level === 'high' ? 'bg-orange-400' : 'bg-yellow-400'
            : 'bg-slate-700'
        )} />
      ))}
    </div>
  );
}

// ── Group nudges by urgency ───────────────────────────────────
function groupByUrgency(nudges: NudgeMessage[]) {
  const order = ['critical', 'high', 'medium', 'low'];
  const groups: Record<string, NudgeMessage[]> = {};
  for (const u of order) {
    const items = nudges.filter(n => n.urgencyLevel === u);
    if (items.length) groups[u] = items;
  }
  return groups;
}

// ── Page ──────────────────────────────────────────────────────
export default function NudgesPage() {
  const [nudges,    setNudges]    = useState<NudgeMessage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [running,   setRunning]   = useState(false);
  const [runStage,  setRunStage]  = useState(-1);
  const [result,    setResult]    = useState<{ sent: number; skipped: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const loadNudges = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/nudge?limit=50');
      const json = await res.json();
      if (json.success) setNudges(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNudges(); }, []);

  const runNudgeAgent = async () => {
    setRunning(true);
    setResult(null);
    setRunStage(0);

    // Animate stages
    const t1 = setTimeout(() => setRunStage(1), 1200);
    const t2 = setTimeout(() => setRunStage(2), 2400);

    try {
      const res  = await fetch('/api/nudge', { method: 'POST' });
      const json = await res.json();
      clearTimeout(t1); clearTimeout(t2);
      setRunStage(3); // all done
      if (json.success) {
        setResult({ sent: json.data.nudgesSent, skipped: json.data.skipped });
        loadNudges();
      }
    } catch {
      clearTimeout(t1); clearTimeout(t2);
    } finally {
      setTimeout(() => { setRunning(false); setRunStage(-1); }, 1200);
    }
  };

  const groups = groupByUrgency(nudges);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Nudge Agent</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              AI-generated, human-sounding reminders for overdue and at-risk tasks.
            </p>
          </div>
        </div>
        <button onClick={loadNudges} className="btn-ghost p-2">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Run agent card */}
      <div className="card p-6 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-amber-200 font-semibold mb-1">Run Nudge Agent</h2>
            <p className="text-amber-300/70 text-sm">
              Scans all open action items, identifies overdue and at-risk tasks,
              and generates personalised reminder messages using Gemini Flash.
              Tasks nudged in the last 24 hours are skipped automatically.
            </p>

            {/* Stage animation */}
            {running && <AgentRunAnimation stage={runStage} />}

            {/* Result */}
            {result && !running && (
              <div className="mt-3 flex items-center gap-2 animate-fade-in">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-green-300 text-sm font-medium">
                  Generated {result.sent} nudge message{result.sent !== 1 ? 's' : ''}
                  {result.skipped > 0 && <span className="text-slate-500 font-normal"> · {result.skipped} skipped (already nudged)</span>}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={runNudgeAgent}
            disabled={running}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            {running ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Running…</>
            ) : (
              <><Zap className="w-4 h-4" /> Run Agent</>
            )}
          </button>
        </div>
      </div>

      {/* Recent nudges — grouped by urgency */}
      <div>
        <h2 className="text-white font-semibold mb-4">
          Recent Nudges
          <span className="ml-2 text-slate-500 text-sm font-normal">({nudges.length})</span>
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : nudges.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-float" />
            <p className="text-slate-400">No nudges generated yet.</p>
            <p className="text-slate-600 text-sm mt-1">
              Upload documents with action items, then run the Nudge Agent above.
            </p>
            <button onClick={runNudgeAgent} disabled={running} className="btn-primary mt-4 flex items-center gap-2 mx-auto">
              <Zap className="w-4 h-4" /> Run Nudge Agent Now
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([urgency, items]) => (
              <div key={urgency}>
                {/* Group header */}
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [urgency]: !c[urgency] }))}
                  className="flex items-center gap-2 mb-3 w-full text-left"
                >
                  <span className={clsx('badge', URGENCY_BADGE[urgency])}>
                    {urgency.toUpperCase()} ({items.length})
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-slate-600 text-xs">{collapsed[urgency] ? '▶' : '▼'}</span>
                </button>

                {!collapsed[urgency] && (
                  <div className="space-y-3">
                    {items.map((nudge, i) => (
                      <div
                        key={i}
                        className={clsx('card p-5 animate-slide-up', URGENCY_COLOR[nudge.urgencyLevel])}
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        {/* Header row */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex flex-col gap-1.5 shrink-0 pt-0.5">
                            <UrgencyMeter level={nudge.urgencyLevel} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">{nudge.actionItemTitle}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Users className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-400 text-xs">{nudge.assignee}</span>
                              {nudge.daysOverdue !== null && (
                                <span className="text-red-400 text-xs font-medium">
                                  · {nudge.daysOverdue}d overdue
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={clsx('badge shrink-0', URGENCY_BADGE[nudge.urgencyLevel])}>
                            {nudge.urgencyLevel}
                          </span>
                        </div>

                        {/* The AI message — hero treatment */}
                        <div className="bg-slate-800/70 rounded-xl px-4 py-3 border border-slate-700/50 relative">
                          <div className="absolute -top-2 left-4 px-1.5 bg-slate-900 text-[9px] text-slate-500 uppercase tracking-wider">
                            Generated by Gemini Flash
                          </div>
                          <p className="text-slate-200 text-sm leading-relaxed">
                            "{nudge.message}"
                          </p>
                        </div>

                        <p className="text-slate-600 text-[10px] mt-2">
                          {new Date(nudge.generatedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
