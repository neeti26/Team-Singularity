'use client';

import { useCallback, useState } from 'react';
import { useDropzone }           from 'react-dropzone';
import { Upload, File, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface FileState {
  file:    File;
  status:  'pending' | 'uploading' | 'done' | 'error';
  message: string;
  result?: {
    chunksCreated:        number;
    decisionsExtracted:   number;
    actionItemsExtracted: number;
    summary:              string;
  };
}

const ACCEPTED = {
  'application/pdf':       ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain':            ['.txt'],
  'text/markdown':         ['.md'],
  'application/json':      ['.json'],
};

export default function UploadZone() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles = accepted.map((f) => ({
      file:    f,
      status:  'pending' as const,
      message: 'Ready to process',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   ACCEPTED,
    multiple: true,
    maxSize:  10 * 1024 * 1024, // 10 MB
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;

    setUploading(true);

    // Process files one at a time to show per-file progress
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      // Mark as uploading
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading', message: 'Processing with Gemini…' } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append('files', files[i].file);
        formData.append('uploadedBy', 'demo-user');

        const res = await fetch('/api/ingest', { method: 'POST', body: formData });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Upload failed');
        }

        const result = json.data?.results?.[0];
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status:  'done',
                  message: result
                    ? `${result.chunksCreated} chunks · ${result.decisionsExtracted} decisions · ${result.actionItemsExtracted} action items`
                    : 'Processed successfully',
                  result,
                }
              : f
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', message: msg } : f
          )
        );
      }
    }

    setUploading(false);
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const doneCount    = files.filter((f) => f.status === 'done').length;

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx('drop-zone', isDragActive && 'active')}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-300 font-medium">
          {isDragActive ? 'Drop files here…' : 'Drag & drop documents here'}
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Supports PDF, DOCX, TXT, Markdown, JSON (Slack exports) · Max 10 MB each
        </p>
        <button type="button" className="btn-secondary mt-4 text-sm">
          Browse files
        </button>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="card divide-y divide-slate-700/50">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4">
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {f.status === 'pending'   && <File        className="w-5 h-5 text-slate-400" />}
                {f.status === 'uploading' && <Loader2     className="w-5 h-5 text-blue-400 animate-spin" />}
                {f.status === 'done'      && <CheckCircle className="w-5 h-5 text-green-400" />}
                {f.status === 'error'     && <AlertCircle className="w-5 h-5 text-red-400" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm font-medium truncate">{f.file.name}</p>
                <p className={clsx(
                  'text-xs mt-0.5',
                  f.status === 'done'  && 'text-green-400',
                  f.status === 'error' && 'text-red-400',
                  (f.status === 'pending' || f.status === 'uploading') && 'text-slate-500',
                )}>
                  {f.message}
                </p>

                {/* Summary */}
                {f.result?.summary && (
                  <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 bg-slate-800 rounded px-2 py-1">
                    {f.result.summary}
                  </p>
                )}
              </div>

              {/* Size */}
              <span className="text-slate-600 text-xs shrink-0">
                {(f.file.size / 1024).toFixed(0)} KB
              </span>

              {/* Remove */}
              {f.status === 'pending' && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading || pendingCount === 0}
            className="btn-primary flex items-center gap-2"
          >
            {uploading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
              : <><Upload className="w-4 h-4" /> Process {pendingCount} file{pendingCount !== 1 ? 's' : ''}</>
            }
          </button>

          {doneCount > 0 && (
            <span className="text-green-400 text-sm">
              ✓ {doneCount} document{doneCount !== 1 ? 's' : ''} processed
            </span>
          )}

          <button
            onClick={() => setFiles([])}
            className="btn-ghost text-sm ml-auto"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
