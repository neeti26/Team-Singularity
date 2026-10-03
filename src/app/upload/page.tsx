'use client';

import { useEffect, useState } from 'react';
import UploadZone from '@/components/UploadZone';
import { FileText, Trash2, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { UploadedDocument } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  meeting_transcript: '🎙️ Meeting',
  email:              '📧 Email',
  slack_export:       '💬 Slack',
  document:           '📄 Document',
  other:              '📎 Other',
};

const STATUS_ICON = {
  processing: <Loader2   className="w-4 h-4 text-amber-400 animate-spin" />,
  processed:  <CheckCircle className="w-4 h-4 text-green-400" />,
  failed:     <AlertCircle className="w-4 h-4 text-red-400" />,
};

export default function UploadPage() {
  const [docs,    setDocs]    = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/ingest?limit=50');
      const json = await res.json();
      if (json.success) setDocs(json.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDocs(); }, []);

  const deleteDoc = async (id: string) => {
    if (!confirm('Delete this document and all extracted data?')) return;
    const res = await fetch(`/api/ingest?id=${id}`, { method: 'DELETE' });
    if ((await res.json()).success) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Documents</h1>
        <p className="text-slate-400 text-sm mt-1">
          Drop meeting transcripts, emails, Slack exports, or any document.
          Gemini will extract decisions and action items automatically.
        </p>
      </div>

      {/* Supported formats */}
      <div className="flex flex-wrap gap-2">
        {['PDF', 'DOCX', 'TXT', 'Markdown', 'JSON (Slack)'].map((f) => (
          <span key={f} className="badge bg-slate-700/50 text-slate-300 border border-slate-600">
            {f}
          </span>
        ))}
      </div>

      <UploadZone />

      {/* Document library */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">
            Document Library
            <span className="ml-2 text-slate-500 text-sm font-normal">({docs.length})</span>
          </h2>
          <button onClick={loadDocs} className="btn-ghost text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4 flex gap-3">
                <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-48" />
                  <div className="skeleton h-2 w-72" />
                </div>
              </div>
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="card p-12 text-center">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No documents uploaded yet.</p>
            <p className="text-slate-600 text-sm mt-1">
              Upload your first document above to get started.
            </p>
          </div>
        ) : (
          <div className="card divide-y divide-slate-700/50">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-start gap-4 p-4 group hover:bg-white/[0.02]">
                <div className="w-9 h-9 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center text-lg shrink-0">
                  {TYPE_LABELS[doc.type]?.split(' ')[0] ?? '📎'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="text-slate-200 font-medium truncate">{doc.name}</p>
                    <span className="badge bg-slate-700 text-slate-400 shrink-0">
                      {TYPE_LABELS[doc.type]?.split(' ').slice(1).join(' ') ?? doc.type}
                    </span>
                  </div>
                  {doc.summary && (
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{doc.summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICON[doc.status]}
                      <span className={`text-xs capitalize ${
                        doc.status === 'processed' ? 'text-green-400' :
                        doc.status === 'failed'    ? 'text-red-400' :
                        'text-amber-400'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    {doc.chunkCount && (
                      <span className="text-slate-600 text-xs">{doc.chunkCount} chunks</span>
                    )}
                    <span className="text-slate-600 text-xs">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteDoc(doc.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400
                             transition-all p-1 rounded shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
