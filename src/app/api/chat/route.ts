/**
 * POST /api/chat
 * ──────────────
 * Handles conversational Q&A over the organisation's knowledge base.
 * Uses the QAAgent (RAG pipeline) to answer questions with citations.
 *
 * Maintains chat sessions in Firestore for conversation continuity.
 *
 * Body: { message: string; sessionId?: string; userId?: string }
 * Returns: { message: ChatMessage; sessionId: string }
 */
import { NextRequest, NextResponse }     from 'next/server';
import { v4 as uuidv4 }                  from 'uuid';
import { runQAAgent, buildAssistantMessage } from '@/agents/qa-agent';
import { collections }                   from '@/lib/firebase-admin';
import type { ApiResponse, ChatMessage, ChatSession, ChatResponse } from '@/types';

export const runtime     = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      message:   string;
      sessionId?: string;
      userId?:    string;
    };

    const { message, userId = 'anonymous' } = body;
    let { sessionId } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Message cannot be empty.' },
        { status: 400 }
      );
    }

    // ── 1. Load or create chat session ───────────────────────
    let session: ChatSession;

    if (sessionId) {
      const snap = await collections.chatSessions().doc(sessionId).get();
      if (snap.exists) {
        session = snap.data() as ChatSession;
      } else {
        sessionId = undefined; // invalid id — create fresh
      }
    }

    if (!sessionId) {
      sessionId = uuidv4();
      session = {
        id:        sessionId,
        title:     message.slice(0, 60),
        messages:  [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // ── 2. Append user message ────────────────────────────────
    const userMessage: ChatMessage = {
      id:        uuidv4(),
      role:      'user',
      content:   message,
      timestamp: new Date().toISOString(),
    };
    session!.messages.push(userMessage);

    // ── 3. Build conversation history for context ─────────────
    const history = session!.messages.slice(-10).map((m) => ({
      role:    m.role,
      content: m.content,
    }));

    // ── 4. Run QA agent ───────────────────────────────────────
    const qaResult = await runQAAgent(message, history);
    const assistantMessage = buildAssistantMessage(qaResult);

    // ── 5. Append assistant message ───────────────────────────
    session!.messages.push(assistantMessage);
    session!.updatedAt = new Date().toISOString();

    // Auto-generate better title after first exchange
    if (session!.messages.length === 2) {
      session!.title = message.slice(0, 60);
    }

    // ── 6. Persist session ────────────────────────────────────
    await collections.chatSessions().doc(sessionId!).set(session!);

    return NextResponse.json<ApiResponse<ChatResponse>>({
      success: true,
      data: {
        message:   assistantMessage,
        sessionId: sessionId!,
      },
    });
  } catch (err) {
    console.error('[POST /api/chat] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/** GET /api/chat?sessionId=<id>  — fetch a session's message history */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      // List all sessions (most recent first)
      const snap = await collections.chatSessions()
        .orderBy('updatedAt', 'desc')
        .limit(20)
        .get();
      const sessions = snap.docs.map((d) => {
        const s = d.data() as ChatSession;
        // Return only metadata (not full message history) for listing
        return { id: s.id, title: s.title, createdAt: s.createdAt, updatedAt: s.updatedAt, messageCount: s.messages.length };
      });
      return NextResponse.json<ApiResponse<typeof sessions>>({ success: true, data: sessions });
    }

    const snap = await collections.chatSessions().doc(sessionId).get();
    if (!snap.exists) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Session not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<ChatSession>>({
      success: true,
      data: snap.data() as ChatSession,
    });
  } catch (err) {
    console.error('[GET /api/chat] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch chat session.' },
      { status: 500 }
    );
  }
}

/** DELETE /api/chat?sessionId=<id> — delete a chat session */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing sessionId.' },
        { status: 400 }
      );
    }
    await collections.chatSessions().doc(sessionId).delete();
    return NextResponse.json<ApiResponse<{ deleted: string }>>({
      success: true,
      data: { deleted: sessionId },
    });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to delete session.' },
      { status: 500 }
    );
  }
}
