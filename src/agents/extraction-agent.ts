/**
 * ExtractionAgent
 * ───────────────
 * Responsibility: Run structured extraction on a full document text to pull out:
 *   - Key decisions made
 *   - Action items with assignees and due dates
 *
 * Uses Gemini 1.5 Pro for high-accuracy structured extraction.
 * This is the second agent in the pipeline (runs after ingestion).
 */
import { v4 as uuidv4 } from 'uuid';
import { getGeminiModel, parseGeminiJson } from '@/lib/gemini';
import { collections } from '@/lib/firebase-admin';
import type { Decision, ActionItem, ActionItemPriority } from '@/types';

// ── Decision Extraction ───────────────────────────────────────

interface RawDecision {
  title: string;
  description: string;
  decision_date?: string;
  made_by?: string[];
  context?: string;
  outcome: string;
  tags?: string[];
}

export async function extractDecisions(
  documentText: string,
  documentId: string,
  documentName: string
): Promise<Decision[]> {
  const model = getGeminiModel({ temperature: 0.1 });

  const prompt = `You are an expert analyst reading a business document.
Extract every DECISION that was made or agreed upon in the following document.
A decision is a firm commitment, agreement, or conclusion reached — not a question or discussion.

Return a JSON array. If no decisions found, return [].
Each decision must have these exact fields:
{
  "title": "short decision title (max 10 words)",
  "description": "full description of what was decided",
  "decision_date": "YYYY-MM-DD if mentioned, otherwise null",
  "made_by": ["array", "of", "names", "mentioned"],
  "context": "what problem or situation prompted this decision",
  "outcome": "what will happen as a result",
  "tags": ["topic1", "topic2"]
}

Document:
"""
${documentText.slice(0, 15000)}
"""

Return only the JSON array, no other text:`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  let rawDecisions: RawDecision[] = [];
  try {
    rawDecisions = parseGeminiJson<RawDecision[]>(raw);
    if (!Array.isArray(rawDecisions)) rawDecisions = [];
  } catch {
    rawDecisions = [];
  }

  const decisions: Decision[] = rawDecisions.map((d) => ({
    id:           uuidv4(),
    documentId,
    documentName,
    title:        d.title || 'Untitled Decision',
    description:  d.description || '',
    decisionDate: d.decision_date || new Date().toISOString().slice(0, 10),
    madeBy:       d.made_by || [],
    context:      d.context || '',
    outcome:      d.outcome || '',
    tags:         d.tags || [],
    extractedAt:  new Date().toISOString(),
  }));

  // Persist to Firestore
  if (decisions.length > 0) {
    const batch = collections.decisions().firestore.batch();
    for (const dec of decisions) {
      batch.set(collections.decisions().doc(dec.id), dec);
    }
    await batch.commit();
  }

  return decisions;
}

// ── Action Item Extraction ────────────────────────────────────

interface RawActionItem {
  title: string;
  description?: string;
  assignee?: string;
  due_date?: string;
  priority?: string;
}

function normalisePriority(raw?: string): ActionItemPriority {
  const p = (raw || '').toLowerCase();
  if (p === 'critical') return 'critical';
  if (p === 'high')     return 'high';
  if (p === 'low')      return 'low';
  return 'medium';
}

export async function extractActionItems(
  documentText: string,
  documentId: string,
  documentName: string
): Promise<ActionItem[]> {
  const model = getGeminiModel({ temperature: 0.1 });

  const prompt = `You are an expert analyst reading a business document.
Extract every ACTION ITEM, task, or follow-up that was assigned or agreed upon.
An action item is something a specific person (or team) must DO after this meeting/document.

Return a JSON array. If no action items found, return [].
Each action item must have these exact fields:
{
  "title": "short task title (max 12 words)",
  "description": "full description of what needs to be done",
  "assignee": "person or team responsible (use 'Unassigned' if unclear)",
  "due_date": "YYYY-MM-DD if mentioned, otherwise null",
  "priority": "critical | high | medium | low — infer from urgency language"
}

Document:
"""
${documentText.slice(0, 15000)}
"""

Return only the JSON array, no other text:`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  let rawItems: RawActionItem[] = [];
  try {
    rawItems = parseGeminiJson<RawActionItem[]>(raw);
    if (!Array.isArray(rawItems)) rawItems = [];
  } catch {
    rawItems = [];
  }

  const now = new Date().toISOString();

  const actionItems: ActionItem[] = rawItems.map((item) => ({
    id:           uuidv4(),
    documentId,
    documentName,
    title:        item.title || 'Untitled Task',
    description:  item.description || '',
    assignee:     item.assignee || 'Unassigned',
    dueDate:      item.due_date || null,
    status:       'open',
    priority:     normalisePriority(item.priority),
    extractedAt:  now,
    lastNudgedAt: null,
    completedAt:  null,
  }));

  // Persist to Firestore
  if (actionItems.length > 0) {
    const batch = collections.actionItems().firestore.batch();
    for (const ai of actionItems) {
      batch.set(collections.actionItems().doc(ai.id), ai);
    }
    await batch.commit();
  }

  return actionItems;
}

// ── Combined extraction ───────────────────────────────────────

export interface ExtractionResult {
  decisions:   Decision[];
  actionItems: ActionItem[];
}

export async function runExtractionAgent(
  documentText: string,
  documentId: string,
  documentName: string
): Promise<ExtractionResult> {
  // Run both in parallel — independent tasks
  const [decisions, actionItems] = await Promise.all([
    extractDecisions(documentText, documentId, documentName),
    extractActionItems(documentText, documentId, documentName),
  ]);

  return { decisions, actionItems };
}
