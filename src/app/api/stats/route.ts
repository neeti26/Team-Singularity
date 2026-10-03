import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, OrgStats } from '@/types';

export const runtime = 'nodejs';

const isMockMode = !process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export async function GET(_req: NextRequest) {
  try {
    if (isMockMode) {
      const { MOCK_STATS } = await import('@/lib/mock-data');
      return NextResponse.json<ApiResponse<OrgStats>>({ success: true, data: MOCK_STATS });
    }

    const { getOrgStats } = await import('@/agents/orchestrator');
    const stats = await getOrgStats();
    return NextResponse.json<ApiResponse<OrgStats>>({ success: true, data: stats });
  } catch (err) {
    console.error('[GET /api/stats] Error:', err);
    // Fallback to mock on any error
    try {
      const { MOCK_STATS } = await import('@/lib/mock-data');
      return NextResponse.json<ApiResponse<OrgStats>>({ success: true, data: MOCK_STATS });
    } catch {
      return NextResponse.json<ApiResponse<null>>({ success: false, error: 'Failed to fetch stats.' }, { status: 500 });
    }
  }
}
