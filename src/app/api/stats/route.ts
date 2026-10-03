/**
 * GET /api/stats — aggregate dashboard statistics
 */
import { NextRequest, NextResponse } from 'next/server';
import { getOrgStats }               from '@/agents/orchestrator';
import type { ApiResponse, OrgStats } from '@/types';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const stats = await getOrgStats();
    return NextResponse.json<ApiResponse<OrgStats>>({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error('[GET /api/stats] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch stats.' },
      { status: 500 }
    );
  }
}
