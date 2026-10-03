'use client';

import { useState, useEffect } from 'react';
import { Bell, Zap, RefreshCw, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import type { NudgeMessage } from '@/agents/nudge-agent';
import clsx from 'clsx';

const URGENCY_COLOR: Record<string, string> = {
  critical: 'border-red-500/30 bg-red-500/5',
  high:     'border-orange-500/30 bg-orange-500/5',
  medium:   'border-yellow-500/30 bg-yellow-500/5',
  low:      'border-slate-700',
};

const URGENCY_BADGE: Record<string, string> = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
};

const URGENCY_ICON = {
  critical: AlertTriangle,
  high:     AlertTriangle,
  medium:   Clock,
  low:      CheckCircle,
};

export default function NudgesPage() {
  const [nudges,  setNudges]  = useState<NudgeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result,  setResult]  = useState<string | null>(null);

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
    try {
      const res  = await fetch('/api/nudge', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setResult(
          json.data.nudgesSent === 0
            ? 'All tasks are on track — no nudges needed.'
            : `Generated ${json.data.nudgesSent} nudge message${json.data.nudgesSent !== 1 ? 's' : ''}`
        );
        loadNudges();
      }
    } finally {
      setRunning(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button onClick={loadNudges} className="btn-ghost p-2">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Run agent */}
      <div className="card p-6 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-amber-200 font-semibold mb-1">Run Nudge Agent</h2>
            <p className="text-amber-300/70 text-sm">
              Scans all open action items, identifies overdue and at-risk tasks,
              and generates personalised reminder messages using Gemini. Tasks nudged
              in the last 24 hours are skipped automatically.
            </p>
            {result && (
              <p className="text-green-300 text-sm mt-2 font-medium">✓ {result}</p>
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

      {/* Recent nudges */}
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
            <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No nudges generated yet.</p>
            <p className="text-slate-600 text-sm mt-1">
              Upload documents with action items, then run the Nudge Agent above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {nudges.map((nudge, i) => {
              const UrgencyIcon = URGENCY_ICON[nudge.urgencyLevel] ?? Clock;
              return (
                <div
                  key={i}
                  className={clsx('card p-5', URGENCY_COLOR[nudge.urgencyLevel])}
                >
                  <div className="flex items-start gap-3">
                    <UrgencyIcon className={clsx(
                      'w-4 h-4 mt-0.5 shrink-0',
                      nudge.urgencyLevel === 'critical' || nudge.urgencyLevel === 'high'
                        ? 'text-red-400' : 'text-amber-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <p className="text-white font-medium text-sm truncate flex-1">
                          {nudge.actionItemTitle}
                        </p>
                        <span className={clsx('badge shrink-0', URGENCY_BADGE[nudge.urgencyLevel])}>
                          {nudge.urgencyLevel}
                        </span>
                      </div>

                      <div className="bg-slate-800/60 rounded-lg px-3 py-2.5 mb-2">
                        <p className="text-slate-300 text-sm leading-relaxed italic">
                          "{nudge.message}"
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>→ {nudge.assignee}</span>
                        {nudge.daysOverdue !== null && (
                          <span className="text-red-400">
                            {nudge.daysOverdue}d overdue
                          </span>
                        )}
                        <span>{new Date(nudge.generatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
