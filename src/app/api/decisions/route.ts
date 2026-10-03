/**
 * GET /api/decisions — list all extracted decisions
 * Query params: ?search=<text>&limit=<n>&tag=<tag>
 */
import { NextRequest, NextResponse } from 'next/server';
import { collections }               from '@/lib/firebase-admin';
import type { ApiResponse, Decision } from '@/types';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase();
    const tag    = searchParams.get('tag');
    const limit  = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let query = collections.decisions() as FirebaseFirestore.Query;

    if (tag) {
      query = query.where('tags', 'array-contains', tag);
    }

    query = query.orderBy('extractedAt', 'desc').limit(limit);

    const snap = await query.get();
    let decisions = snap.docs.map((d) => d.data() as Decision);

    // Client-side text search (Firestore full-text search requires Algolia/Typesense
    // in production; for the prototype this is fine)
    if (search) {
      decisions = decisions.filter(
        (d) =>
          d.title.toLowerCase().includes(search) ||
          d.description.toLowerCase().includes(search) ||
          d.outcome.toLowerCase().includes(search) ||
          d.madeBy.some((name) => name.toLowerCase().includes(search))
      );
    }

    return NextResponse.json<ApiResponse<Decision[]>>({
      success: true,
      data: decisions,
    });
  } catch (err) {
    console.error('[GET /api/decisions] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch decisions.' },
      { status: 500 }
    );
  }
}
