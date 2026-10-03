'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown    from 'react-markdown';
import { Send, Loader2, Zap, BookOpen, FileText, RotateCcw, Copy, Check, Brain, Search, Sparkles } from 'lucide-react';
import clsx             from 'clsx';
import type { ChatMessage, SourceReference } from '@/types';

// ── Suggested questions ───────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  'What decisions were made in the last sprint?',
  'Who is responsible for the API integration task?',
  'Summarise the Q3 planning meeting',
  'What are all overdue action items?',
  'What was decided about the vendor contract?',
  'List all open tasks assigned to the engineering team',
];

// ── RAG Pipeline visualisation ────────────────────────────────
const PIPELINE_STAGES = [
  { icon: Brain,    label: 'Embedding query',          ms: 0    },
  { icon: Search,   label: 'Searching knowledge base', ms: 900  },
  { icon: Sparkles, label: 'Synthesising with Gemini', ms: 1800 },
];

function RagPipeline({ active }: { active: boolean }) {
  const [stage, setStage] = useState(-1);

  useEffect(() => {
    if (!active) { setStage(-1); return; }
    setStage(0);
    const t1 = setTimeout(() => setStage(1), 900);
    const t2 = setTimeout(() => setStage(2), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-slate-800/70 border border-slate-700 rounded-2xl rounded-tl-sm max-w-[85%]">
      <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">
        AI Agent Pipeline
      </p>
      {PIPELINE_STAGES.map(({ icon: Icon, label }, i) => {
        const isDone   = stage > i;
        const isActive = stage === i;
        return (
          <div key={i} className="flex items-center gap-2.5">
            <div className={clsx(
              'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 shrink-0',
              isDone   && 'bg-green-500/20 border border-green-500/40',
              isActive && 'bg-blue-500/20 border border-blue-500/40',
              !isDone && !isActive && 'bg-slate-700 border border-slate-600',
            )}>
              {isDone
                ? <Check    className="w-3 h-3 text-green-400" />
                : <Icon     className={clsx('w-3 h-3', isActive ? 'text-blue-400 animate-pulse' : 'text-slate-600')} />
              }
            </div>
            <span className={clsx(
              'text-xs transition-all duration-300',
              isDone   && 'text-green-400 line-through decoration-green-600',
              isActive && 'text-blue-300 font-medium',
              !isDone && !isActive && 'text-slate-600',
            )}>
              {label}
            </span>
            {isActive && (
              <span className="flex gap-1 ml-1">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Source badge ──────────────────────────────────────────────
function SourceBadge({ source }: { source: SourceReference }) {
  return (
    <div className="flex items-start gap-2 bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs">
      <FileText className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-blue-300 font-medium truncate">{source.documentName}</p>
        <p className="text-slate-400 mt-0.5 line-clamp-2">{source.excerpt}</p>
        <div className="mt-1.5 flex items-center gap-1">
          <div className="flex-1 bg-slate-700 rounded-full h-1">
            <div
              className="h-1 rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${(source.relevanceScore * 100).toFixed(0)}%` }}
            />
          </div>
          <span className="text-slate-500">{(source.relevanceScore * 100).toFixed(0)}% match</span>
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={clsx('flex flex-col group animate-fade-in', isUser ? 'items-end' : 'items-start')}>
      <div className={clsx('relative', isUser ? 'chat-bubble-user' : 'chat-bubble-assistant')}>
        {isUser ? (
          <p className="text-sm">{msg.content}</p>
        ) : (
          <div className="prose-dark text-sm">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}

        {/* Copy button */}
        {!isUser && (
          <button
            onClick={copy}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                       p-1 rounded bg-slate-600/80 hover:bg-slate-500"
          >
            {copied
              ? <Check className="w-3 h-3 text-green-400" />
              : <Copy  className="w-3 h-3 text-slate-400" />
            }
          </button>
        )}
      </div>

      {/* Agent used pill */}
      {!isUser && msg.agentUsed && (
        <div className="mt-1 px-2 py-0.5 rounded-full bg-blue-600/15 border border-blue-500/20 text-blue-400 text-[10px] font-medium">
          ⚡ {msg.agentUsed}
        </div>
      )}

      {/* Sources toggle */}
      {!isUser && msg.sources && msg.sources.length > 0 && (
        <div className="mt-2 w-full max-w-[85%]">
          <button
            onClick={() => setShowSources((v) => !v)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            {showSources ? 'Hide' : 'Show'} {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
            <span className="text-slate-600">{showSources ? '▲' : '▼'}</span>
          </button>
          {showSources && (
            <div className="mt-1.5 space-y-1.5 animate-fade-in">
              {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
            </div>
          )}
        </div>
      )}

      <p className="text-slate-600 text-[10px] mt-1 px-1">
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function ChatInterface() {
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [sessionId,  setSessionId]  = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: trimmed, sessionId }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        setMessages((prev) => [...prev, json.data.message]);
        setSessionId(json.data.sessionId);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id:        crypto.randomUUID(),
            role:      'assistant' as const,
            content:   `Sorry, something went wrong: ${json.error || 'Unknown error'}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id:        crypto.randomUUID(),
          role:      'assistant' as const,
          content:   'Network error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [loading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const reset = () => {
    setMessages([]);
    setSessionId(null);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <h2 className="text-white font-semibold">Ask Singularity AI</h2>
          {sessionId && (
            <span className="text-slate-600 text-xs font-mono">
              #{sessionId.slice(-6)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600 text-xs hidden sm:block">
            Gemini 1.5 Pro · RAG · {messages.filter(m=>m.role==='user').length} queries
          </span>
          {messages.length > 0 && (
            <button onClick={reset} className="btn-ghost text-xs flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> New chat
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4 animate-float">
              <Zap className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              Your Org's Memory is Ready
            </h3>
            <p className="text-slate-400 text-sm max-w-md">
              Ask anything about your uploaded documents — decisions, action items, deadlines, context.
              Singularity AI cites its sources so you can verify every answer.
            </p>
            {/* Pipeline preview */}
            <div className="mt-5 flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5">
              {PIPELINE_STAGES.map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Icon className="w-2.5 h-2.5 text-blue-400" />
                  </div>
                  <span className="text-slate-500 text-[10px]">{label}</span>
                  {i < PIPELINE_STAGES.length - 1 && <span className="text-slate-700 text-[10px]">→</span>}
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700
                             border border-slate-700 hover:border-blue-500/40 text-slate-300
                             text-xs transition-all duration-150 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* RAG pipeline visualisation while loading */}
        {loading && (
          <div className="flex items-start">
            <RagPipeline active={loading} />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-800">
        {/* Suggested questions quick row when in conversation */}
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
            {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800
                           border border-slate-700 hover:border-blue-500/40 text-slate-400
                           hover:text-white transition-all shrink-0 disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-3 bg-slate-800 border border-slate-600 rounded-xl px-4 py-3
                        focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent
                        transition-all duration-150">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about decisions, action items, or any topic in your documents…"
            rows={1}
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm
                       resize-none focus:outline-none max-h-32 leading-relaxed"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = t.scrollHeight + 'px';
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="btn-primary p-2 rounded-lg shrink-0 self-end"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send    className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-slate-600 text-[10px] mt-1.5 text-center">
          Gemini 1.5 Pro · RAG with text-embedding-004 · Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
