'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle, RefreshCw, Bell } from 'lucide-react';
import clsx from 'clsx';
import type { ActionItem, ActionItemStatus } from '@/types';

const STATUS_OPTIONS: ActionItemStatus[] = ['open', 'in_progress', 'overdue', 'completed'];

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'badge-critical',
  high:     'badge-high',
  medium:   'badge-medium',
  low:      'badge-low',
};

const STATUS_BADGE: Record<string, string> = {
  open:        'badge-open',
  in_progress: 'badge-progress',
  overdue:     'badge-overdue',
  completed:   'badge-done',
};

const STATUS_ICON = {
  open:        Circle,
  in_progress: Clock,
  overdue:     AlertTriangle,
  completed:   CheckCircle2,
};

interface Props {
  initialFilter?: ActionItemStatus[];
}

export default function ActionItemsTable({ initialFilter }: Props) {
  const [items,        setItems]        = useState<ActionItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<string>(initialFilter?.join(',') || '');
  const [nudging,      setNudging]      = useState(false);
  const [nudgeResult,  setNudgeResult]  = useState<string | null>(null);
  const [search,       setSearch]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      params.set('limit', '200');
      const res  = await fetch(`/api/action-items?${params}`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: ActionItemStatus) => {
    const res  = await fetch('/api/action-items', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, status }),
    });
    const json = await res.json();
    if (json.success) {
      setItems((prev) => prev.map((i) => (i.id === id ? json.data : i)));
    }
  };

  const triggerNudge = async () => {
    setNudging(true);
    setNudgeResult(null);
    try {
      const res  = await fetch('/api/nudge', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setNudgeResult(`Sent ${json.data.nudgesSent} nudge${json.data.nudgesSent !== 1 ? 's' : ''}`);
        load();
      }
    } finally {
      setNudging(false);
    }
  };

  const filtered = search
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.assignee.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter tabs */}
        <div className="flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setFilter('')}
            className={clsx(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              filter === '' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            All
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all',
                filter === s ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search tasks or assignees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs text-sm"
        />

        <div className="ml-auto flex items-center gap-2">
          {nudgeResult && (
            <span className="text-green-400 text-xs">{nudgeResult}</span>
          )}
          <button
            onClick={triggerNudge}
            disabled={nudging}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Bell className={clsx('w-3.5 h-3.5', nudging && 'animate-pulse')} />
            {nudging ? 'Nudging…' : 'Run Nudge Agent'}
          </button>
          <button onClick={load} className="btn-ghost p-2">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/50">
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3 w-8">#</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Task</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Assignee</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Due</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Priority</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Status</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Source</th>
                <th className="text-left text-slate-500 text-xs font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="px-4 py-3">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-3 w-full rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500 py-12">
                    No action items found. Upload a document to extract tasks.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const StatusIcon = STATUS_ICON[item.status];
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-slate-600 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-slate-200 font-medium truncate">{item.title}</p>
                        {item.description && (
                          <p className="text-slate-500 text-xs mt-0.5 truncate">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 text-xs bg-slate-700 px-2 py-0.5 rounded-full">
                          {item.assignee}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {item.dueDate
                          ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                          : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={PRIORITY_BADGE[item.priority] || 'badge'}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('badge flex items-center gap-1', STATUS_BADGE[item.status])}>
                          <StatusIcon className="w-3 h-3" />
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[120px] truncate">
                        {item.documentName}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={item.status}
                          onChange={(e) => updateStatus(item.id, e.target.value as ActionItemStatus)}
                          className="text-xs bg-slate-700 border border-slate-600 text-slate-300
                                     rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-700 text-slate-500 text-xs">
            Showing {filtered.length} of {items.length} items
          </div>
        )}
      </div>
    </div>
  );
}
