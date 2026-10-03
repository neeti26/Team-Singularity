import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, ActionItem, ActionItemStatus } from '@/types';

export const runtime = 'nodejs';

const isMockMode = !process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// In-memory mock store for status updates during demo
let mockStore: ActionItem[] | null = null;
const getMockStore = async () => {
  if (!mockStore) {
    const { MOCK_ACTION_ITEMS } = await import('@/lib/mock-data');
    mockStore = JSON.parse(JSON.stringify(MOCK_ACTION_ITEMS));
  }
  return mockStore!;
};

export async function GET(req: NextRequest) {
  try {
    if (isMockMode) {
      const { searchParams } = new URL(req.url);
      const statusParam = searchParams.get('status');
      const assignee    = searchParams.get('assignee');
      let data = await getMockStore();
      if (statusParam) {
        const statuses = statusParam.split(',');
        data = data.filter(i => statuses.includes(i.status));
      }
      if (assignee) data = data.filter(i => i.assignee === assignee);
      return NextResponse.json<ApiResponse<ActionItem[]>>({ success: true, data });
    }

    const { collections } = await import('@/lib/firebase-admin');
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const assignee    = searchParams.get('assignee');
    const priority    = searchParams.get('priority');
    const limit       = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let query = collections.actionItems() as FirebaseFirestore.Query;
    if (statusParam) query = query.where('status', 'in', statusParam.split(','));
    if (assignee)    query = query.where('assignee', '==', assignee);
    if (priority)    query = query.where('priority', '==', priority);
    query = query.orderBy('extractedAt', 'desc').limit(limit);

    const snap = await query.get();
    return NextResponse.json<ApiResponse<ActionItem[]>>({ success: true, data: snap.docs.map(d => d.data() as ActionItem) });
  } catch (err) {
    const data = await getMockStore();
    return NextResponse.json<ApiResponse<ActionItem[]>>({ success: true, data });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as { id: string; status?: ActionItemStatus; assignee?: string; dueDate?: string | null; priority?: string };
    const { id, ...updates } = body;
    if (!id) return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Missing id.' }, { status: 400 });

    if (isMockMode) {
      const store = await getMockStore();
      const idx = store.findIndex(i => i.id === id);
      if (idx !== -1) {
        if (updates.status) {
          store[idx].status = updates.status;
          if (updates.status === 'completed') store[idx].completedAt = new Date().toISOString();
        }
        if (updates.assignee !== undefined) store[idx].assignee = updates.assignee;
        if (updates.dueDate  !== undefined) store[idx].dueDate  = updates.dueDate;
        if (updates.priority !== undefined) store[idx].priority = updates.priority as ActionItem['priority'];
      }
      return NextResponse.json<ApiResponse<ActionItem>>({ success: true, data: store[idx] });
    }

    const { collections } = await import('@/lib/firebase-admin');
    const payload: Record<string, unknown> = {};
    if (updates.status !== undefined) { payload.status = updates.status; if (updates.status === 'completed') payload.completedAt = new Date().toISOString(); }
    if (updates.assignee !== undefined) payload.assignee = updates.assignee;
    if (updates.dueDate  !== undefined) payload.dueDate  = updates.dueDate;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    await collections.actionItems().doc(id).update(payload);
    const updated = await collections.actionItems().doc(id).get();
    return NextResponse.json<ApiResponse<ActionItem>>({ success: true, data: updated.data() as ActionItem });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to update.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Missing id.' }, { status: 400 });
  if (isMockMode) {
    if (mockStore) mockStore = mockStore.filter(i => i.id !== id);
    return NextResponse.json<ApiResponse<{ deleted: string }>>({ success: true, data: { deleted: id } });
  }
  try {
    const { collections } = await import('@/lib/firebase-admin');
    await collections.actionItems().doc(id).delete();
    return NextResponse.json<ApiResponse<{ deleted: string }>>({ success: true, data: { deleted: id } });
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to delete.' }, { status: 500 });
  }
}
