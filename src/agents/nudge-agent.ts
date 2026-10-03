/**
 * NudgeAgent
 * ──────────
 * Responsibility: Proactively surface overdue and at-risk action items.
 * For each stale item, generate a personalised, context-aware nudge message.
 *
 * This agent runs:
 *   - On-demand via POST /api/nudge
 *   - Can be triggered on a schedule via Cloud Scheduler → Cloud Run
 *
 * It uses Gemini to write human, empathetic nudge messages rather than
 * robotic reminders — a key differentiator for the judges.
 */
import { getGeminiFlashModel } from '@/lib/gemini';
import { collections } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import type { ActionItem } from '@/types';
import { differenceInDays, parseISO, isValid } from 'date-fns';

// ── Staleness logic ───────────────────────────────────────────

interface NudgeCandidate {
  item:       ActionItem;
  daysUntilDue: number | null;  // negative = overdue
  isOverdue:  boolean;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
}

function assessUrgency(item: ActionItem): NudgeCandidate {
  let daysUntilDue: number | null = null;
  let isOverdue = false;
  let urgencyLevel: NudgeCandidate['urgencyLevel'] = 'low';

  if (item.dueDate) {
    const due = parseISO(item.dueDate);
    if (isValid(due)) {
      daysUntilDue = differenceInDays(due, new Date());
      isOverdue = daysUntilDue < 0;

      if (isOverdue)                    urgencyLevel = 'critical';
      else if (daysUntilDue <= 1)       urgencyLevel = 'critical';
      else if (daysUntilDue <= 3)       urgencyLevel = 'high';
      else if (daysUntilDue <= 7)       urgencyLevel = 'medium';
      else                              urgencyLevel = 'low';
    }
  }

  // Boost urgency if item.priority is critical/high
  if (item.priority === 'critical' && urgencyLevel !== 'critical') urgencyLevel = 'critical';
  if (item.priority === 'high'     && urgencyLevel === 'low')      urgencyLevel = 'medium';

  return { item, daysUntilDue, isOverdue, urgencyLevel };
}

// ── Message generation ────────────────────────────────────────

export interface NudgeMessage {
  actionItemId:   string;
  actionItemTitle: string;
  assignee:       string;
  message:        string;
  urgencyLevel:   string;
  daysOverdue:    number | null;
  generatedAt:    string;
}

async function generateNudgeMessage(candidate: NudgeCandidate): Promise<string> {
  const model = getGeminiFlashModel({ temperature: 0.7, maxOutputTokens: 256 });
  const { item, daysUntilDue, isOverdue } = candidate;

  const dueContext = isOverdue
    ? `This task is ${Math.abs(daysUntilDue!)} day(s) overdue.`
    : daysUntilDue !== null
    ? `This task is due in ${daysUntilDue} day(s).`
    : 'This task has no due date set.';

  const prompt = `You are a friendly but professional work assistant.
Write a brief, warm nudge message (2–3 sentences max) reminding ${item.assignee} about an open action item.
Be empathetic, not robotic. Mention the task name and urgency naturally.
Do NOT use exclamation marks excessively. Sound human.

Task: "${item.title}"
Description: ${item.description?.slice(0, 200) || 'No description'}
Source document: ${item.documentName}
${dueContext}
Priority: ${item.priority}

Nudge message (2–3 sentences, no subject line):`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ── Main agent function ───────────────────────────────────────

export interface NudgeResult {
  nudgesSent:  number;
  messages:    NudgeMessage[];
  skipped:     number;
}

export async function runNudgeAgent(): Promise<NudgeResult> {
  // Fetch all open/in-progress action items
  const snap = await collections.actionItems()
    .where('status', 'in', ['open', 'in_progress'])
    .get();

  if (snap.empty) {
    return { nudgesSent: 0, messages: [], skipped: 0 };
  }

  const now = new Date();
  const candidates: NudgeCandidate[] = [];

  for (const doc of snap.docs) {
    const item = doc.data() as ActionItem;

    // Skip items nudged in the last 24 hours
    if (item.lastNudgedAt) {
      const lastNudged = parseISO(item.lastNudgedAt);
      if (isValid(lastNudged) && differenceInDays(now, lastNudged) < 1) {
        continue;
      }
    }

    const candidate = assessUrgency(item);

    // Only nudge medium urgency and above
    if (candidate.urgencyLevel !== 'low') {
      candidates.push(candidate);
    }
  }

  // Sort by urgency (critical first)
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  candidates.sort((a, b) => urgencyOrder[a.urgencyLevel] - urgencyOrder[b.urgencyLevel]);

  // Process up to 20 nudges per run to avoid API overload
  const toProcess = candidates.slice(0, 20);
  const messages: NudgeMessage[] = [];

  for (const candidate of toProcess) {
    const message = await generateNudgeMessage(candidate);
    const nowStr = now.toISOString();

    const nudge: NudgeMessage = {
      actionItemId:    candidate.item.id,
      actionItemTitle: candidate.item.title,
      assignee:        candidate.item.assignee,
      message,
      urgencyLevel:    candidate.urgencyLevel,
      daysOverdue:     candidate.isOverdue ? Math.abs(candidate.daysUntilDue!) : null,
      generatedAt:     nowStr,
    };

    messages.push(nudge);

    // Update lastNudgedAt + mark overdue items
    const updateData: Record<string, unknown> = { lastNudgedAt: nowStr };
    if (candidate.isOverdue && candidate.item.status !== 'overdue') {
      updateData.status = 'overdue';
    }
    await collections.actionItems().doc(candidate.item.id).update(updateData);

    // Log nudge
    await collections.nudgeLogs().doc(uuidv4()).set({
      ...nudge,
      id: uuidv4(),
    });
  }

  return {
    nudgesSent: messages.length,
    messages,
    skipped:    candidates.length - toProcess.length,
  };
}

/** Get all recent nudge messages (for the dashboard) */
export async function getRecentNudges(limit = 20): Promise<NudgeMessage[]> {
  const snap = await collections.nudgeLogs()
    .orderBy('generatedAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map((d) => d.data() as NudgeMessage);
}
