import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Decision } from '@/types';

export const runtime = 'nodejs';

const isMockMode = !process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export async function GET(req: NextRequest) {
  try {
    if (isMockMode) {
      const { MOCK_DECISIONS } = await import('@/lib/mock-data');
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search')?.toLowerCase();
      let data = MOCK_DECISIONS;
      if (search) {
        data = data.filter(d =>
          d.title.toLowerCase().includes(search) ||
          d.description.toLowerCase().includes(search) ||
          d.outcome.toLowerCase().includes(search) ||
          d.madeBy.some(n => n.toLowerCase().includes(search))
        );
      }
      return NextResponse.json<ApiResponse<Decision[]>>({ success: true, data });
    }

    const { collections } = await import('@/lib/firebase-admin');
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase();
    const tag    = searchParams.get('tag');
    const limit  = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let query = collections.decisions() as FirebaseFirestore.Query;
    if (tag) query = query.where('tags', 'array-contains', tag);
    query = query.orderBy('extractedAt', 'desc').limit(limit);

    const snap = await query.get();
    let decisions = snap.docs.map((d) => d.data() as Decision);
    if (search) {
      decisions = decisions.filter(d =>
        d.title.toLowerCase().includes(search) ||
        d.description.toLowerCase().includes(search) ||
        d.outcome.toLowerCase().includes(search) ||
        d.madeBy.some(n => n.toLowerCase().includes(search))
      );
    }
    return NextResponse.json<ApiResponse<Decision[]>>({ success: true, data: decisions });
  } catch (err) {
    console.error('[GET /api/decisions] Error:', err);
    const { MOCK_DECISIONS } = await import('@/lib/mock-data');
    return NextResponse.json<ApiResponse<Decision[]>>({ success: true, data: MOCK_DECISIONS });
  }
}
