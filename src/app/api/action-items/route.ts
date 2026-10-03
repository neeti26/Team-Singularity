/**
 * /api/action-items
 * ──────────────────
 * GET    — list action items (with optional status / assignee filters)
 * PATCH  — update status or other fields on a single action item
 * DELETE — remove an action item
 */
import { NextRequest, NextResponse } from 'next/server';
import { collections }               from '@/lib/firebase-admin';
import type { ApiResponse, ActionItem, ActionItemStatus } from '@/types';

export const runtime = 'nodejs';

// ── GET ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam   = searchParams.get('status');   // comma-separated
    const assignee      = searchParams.get('assignee');
    const priority      = searchParams.get('priority');
    const limit         = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let query = collections.actionItems() as FirebaseFirestore.Query;

    if (statusParam) {
      const statuses = statusParam.split(',').map((s) => s.trim());
      query = query.where('status', 'in', statuses);
    }
    if (assignee) {
      query = query.where('assignee', '==', assignee);
    }
    if (priority) {
      query = query.where('priority', '==', priority);
    }

    query = query.orderBy('extractedAt', 'desc').limit(limit);

    const snap = await query.get();
    const items = snap.docs.map((d) => d.data() as ActionItem);

    return NextResponse.json<ApiResponse<ActionItem[]>>({
      success: true,
      data: items,
    });
  } catch (err) {
    console.error('[GET /api/action-items] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch action items.' },
      { status: 500 }
    );
  }
}

// ── PATCH ─────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      id:          string;
      status?:     ActionItemStatus;
      assignee?:   string;
      dueDate?:    string | null;
      priority?:   string;
    };

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing action item id.' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, unknown> = {};

    if (updates.status !== undefined) {
      updatePayload.status = updates.status;
      if (updates.status === 'completed') {
        updatePayload.completedAt = new Date().toISOString();
      }
    }
    if (updates.assignee !== undefined) updatePayload.assignee = updates.assignee;
    if (updates.dueDate  !== undefined) updatePayload.dueDate  = updates.dueDate;
    if (updates.priority !== undefined) updatePayload.priority = updates.priority;

    await collections.actionItems().doc(id).update(updatePayload);

    const updated = await collections.actionItems().doc(id).get();
    return NextResponse.json<ApiResponse<ActionItem>>({
      success: true,
      data: updated.data() as ActionItem,
    });
  } catch (err) {
    console.error('[PATCH /api/action-items] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to update action item.' },
      { status: 500 }
    );
  }
}

// ── DELETE ────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing action item id.' },
        { status: 400 }
      );
    }

    await collections.actionItems().doc(id).delete();

    return NextResponse.json<ApiResponse<{ deleted: string }>>({
      success: true,
      data: { deleted: id },
    });
  } catch (err) {
    console.error('[DELETE /api/action-items] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to delete action item.' },
      { status: 500 }
    );
  }
}
