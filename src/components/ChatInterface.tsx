'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown    from 'react-markdown';
import { Send, Loader2, Zap, BookOpen, FileText, RotateCcw } from 'lucide-react';
import clsx             from 'clsx';
import type { ChatMessage, SourceReference } from '@/types';

const SUGGESTED_QUESTIONS = [
  'What decisions were made in the last sprint?',
  'Who is responsible for the API integration task?',
  'Summarise the Q3 planning meeting',
  'What are all overdue action items?',
  'What was decided about the vendor contract?',
  'List all open tasks assigned to the engineering team',
];

function SourceBadge({ source }: { source: SourceReference }) {
  return (
    <div className="flex items-start gap-2 bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs">
      <FileText className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-blue-300 font-medium truncate">{source.documentName}</p>
        <p className="text-slate-400 mt-0.5 line-clamp-2">{source.excerpt}</p>
        <p className="text-slate-600 mt-1">
          Relevance: {(source.relevanceScore * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={clsx('flex flex-col', isUser ? 'items-end' : 'items-start')}>
      <div className={isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
        {isUser ? (
          <p className="text-sm">{msg.content}</p>
        ) : (
          <div className="prose-dark text-sm">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Sources */}
      {!isUser && msg.sources && msg.sources.length > 0 && (
        <div className="mt-2 w-full max-w-[85%] space-y-1.5">
          <p className="text-slate-600 text-xs flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> Sources
          </p>
          {msg.sources.map((s, i) => (
            <SourceBadge key={i} source={s} />
          ))}
        </div>
      )}

      <p className="text-slate-600 text-[10px] mt-1 px-1">
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        {!isUser && msg.agentUsed && <span className="ml-1.5 text-blue-600">· {msg.agentUsed}</span>}
      </p>
    </div>
  );
}

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
            role:      'assistant',
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
          role:      'assistant',
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
          <h2 className="text-white font-semibold">Ask Team Singularity AI</h2>
          {sessionId && (
            <span className="text-slate-600 text-xs font-mono">
              #{sessionId.slice(-6)}
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button onClick={reset} className="btn-ghost text-xs flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
              <Zap className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              Your Org's Memory is Ready
            </h3>
            <p className="text-slate-400 text-sm max-w-md">
              Ask anything about your uploaded documents — decisions, action items, deadlines, context.
              Team Singularity AI cites its sources so you can verify every answer.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700
                             border border-slate-700 hover:border-slate-500 text-slate-300
                             text-xs transition-all duration-150"
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

        {loading && (
          <div className="flex items-start gap-2">
            <div className="chat-bubble-assistant flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              Searching knowledge base…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-800">
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
          Powered by Gemini 1.5 Pro · Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
