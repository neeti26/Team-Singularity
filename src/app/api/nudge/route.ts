/**
 * POST /api/nudge — trigger the NudgeAgent
 * GET  /api/nudge — get recent nudge messages
 */
import { NextRequest, NextResponse } from 'next/server';
import { runNudgeAgent, getRecentNudges } from '@/agents/nudge-agent';
import type { ApiResponse, NudgeResult } from '@/types';
import type { NudgeMessage } from '@/agents/nudge-agent';

// Re-export NudgeResult type so the frontend can import it
export type { NudgeResult };

export const runtime     = 'nodejs';
export const maxDuration = 120;

export async function POST(_req: NextRequest) {
  try {
    const result = await runNudgeAgent();

    return NextResponse.json<ApiResponse<typeof result>>({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('[POST /api/nudge] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const messages = await getRecentNudges(limit);

    return NextResponse.json<ApiResponse<NudgeMessage[]>>({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error('[GET /api/nudge] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to fetch nudges.' },
      { status: 500 }
    );
  }
}
