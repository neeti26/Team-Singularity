'use client';

import { useState, useEffect } from 'react';
import { Scale, Search, RefreshCw, Users, Calendar, FileText, Tag } from 'lucide-react';
import type { Decision } from '@/types';

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  const load = async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (q) params.set('search', q);
      const res  = await fetch(`/api/decisions?${params}`);
      const json = await res.json();
      if (json.success) setDecisions(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
          <Scale className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Decision Log</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Every decision extracted from your documents — searchable, traceable, permanent.
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search decisions, outcomes, people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button type="submit" className="btn-primary px-5">Search</button>
        <button
          type="button"
          onClick={() => { setSearch(''); load(); }}
          className="btn-ghost p-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </form>

      {/* Count */}
      {!loading && (
        <p className="text-slate-500 text-sm">
          {decisions.length} decision{decisions.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : decisions.length === 0 ? (
        <div className="card p-12 text-center">
          <Scale className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No decisions found.</p>
          <p className="text-slate-600 text-sm mt-1">
            Upload meeting transcripts or documents to extract decisions automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {decisions.map((dec) => (
            <div key={dec.id} className="card p-5 hover:border-slate-500 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-white font-semibold">{dec.title}</h3>
                <span className="text-slate-500 text-xs whitespace-nowrap">
                  {new Date(dec.decisionDate).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-3">{dec.description}</p>

              <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2 mb-3">
                <p className="text-green-300 text-xs font-medium mb-0.5">Outcome</p>
                <p className="text-green-200/80 text-sm">{dec.outcome}</p>
              </div>

              {dec.context && (
                <div className="bg-slate-800 rounded-lg px-3 py-2 mb-3">
                  <p className="text-slate-500 text-xs font-medium mb-0.5">Context</p>
                  <p className="text-slate-400 text-sm">{dec.context}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
                {dec.madeBy.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {dec.madeBy.join(', ')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {dec.documentName}
                </span>
                {dec.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    {dec.tags.slice(0, 4).join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
