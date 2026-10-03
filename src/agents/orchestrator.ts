/**
 * Orchestrator
 * ────────────
 * Coordinates the multi-agent pipeline for document processing.
 *
 * Pipeline:
 *   Document Upload
 *       ↓
 *   IngestionAgent  → Chunks + Embeddings → Firestore
 *       ↓ (parallel)
 *   ExtractionAgent → Decisions + Action Items → Firestore
 *
 * The orchestrator also provides helper functions for reading
 * the organisation's knowledge state.
 */
import { runIngestionAgent }  from './ingestion-agent';
import { runExtractionAgent } from './extraction-agent';
import { collections }        from '@/lib/firebase-admin';
import type {
  UploadedDocument,
  IngestResponse,
  OrgStats,
  ActivityEvent,
  Decision,
  ActionItem,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ── Full pipeline ─────────────────────────────────────────────

export async function processPipeline(
  rawText:  string,
  docMeta:  Pick<UploadedDocument, 'id' | 'name' | 'type' | 'uploadedBy'>
): Promise<IngestResponse> {
  // Stage 1: Ingest (chunk + embed)
  const ingestionResult = await runIngestionAgent(rawText, docMeta);

  // Stage 2: Extract decisions + action items (can run concurrently with ingestion
  // but needs the full text — we run after so Firestore record is ready)
  const extractionResult = await runExtractionAgent(
    rawText,
    docMeta.id,
    docMeta.name
  );

  // Log activity event
  await logActivity({
    type: 'document_uploaded',
    description: `"${docMeta.name}" uploaded — ${extractionResult.decisions.length} decisions and ${extractionResult.actionItems.length} action items extracted`,
  });

  return {
    documentId:           docMeta.id,
    chunksCreated:        ingestionResult.chunksCreated,
    decisionsExtracted:   extractionResult.decisions.length,
    actionItemsExtracted: extractionResult.actionItems.length,
    summary:              ingestionResult.summary,
  };
}

// ── Activity logging ──────────────────────────────────────────

export async function logActivity(
  event: Omit<ActivityEvent, 'id' | 'timestamp'>
): Promise<void> {
  const activity: ActivityEvent = {
    id:        uuidv4(),
    timestamp: new Date().toISOString(),
    ...event,
  };
  await collections.documents().firestore
    .collection('activityLog')
    .doc(activity.id)
    .set(activity);
}

// ── Stats ─────────────────────────────────────────────────────

export async function getOrgStats(): Promise<OrgStats> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [docsSnap, decisionsSnap, actionItemsSnap, activitySnap] = await Promise.all([
    collections.documents().get(),
    collections.decisions().get(),
    collections.actionItems().get(),
    collections.documents().firestore
      .collection('activityLog')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get(),
  ]);

  const actionItems = actionItemsSnap.docs.map((d) => d.data() as ActionItem);
  const openItems     = actionItems.filter((a) => a.status === 'open' || a.status === 'in_progress');
  const overdueItems  = actionItems.filter((a) => a.status === 'overdue');

  const docs = docsSnap.docs.map((d) => d.data() as UploadedDocument);
  const docsThisWeek = docs.filter(
    (d) => new Date(d.uploadedAt) >= weekAgo
  ).length;

  const recentActivity = activitySnap.docs.map((d) => d.data() as ActivityEvent);

  return {
    totalDocuments:    docsSnap.size,
    totalDecisions:    decisionsSnap.size,
    totalActionItems:  actionItemsSnap.size,
    openActionItems:   openItems.length,
    overdueActionItems: overdueItems.length,
    documentsThisWeek: docsThisWeek,
    recentActivity,
  };
}

// ── Document listing ──────────────────────────────────────────

export async function listDocuments(limit = 50): Promise<UploadedDocument[]> {
  const snap = await collections.documents()
    .orderBy('uploadedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as UploadedDocument);
}

// ── Decision listing ──────────────────────────────────────────

export async function listDecisions(limit = 100): Promise<Decision[]> {
  const snap = await collections.decisions()
    .orderBy('extractedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as Decision);
}

// ── Action item listing ───────────────────────────────────────

export async function listActionItems(
  statusFilter?: string[],
  limit = 100
): Promise<ActionItem[]> {
  let query = collections.actionItems().orderBy('extractedAt', 'desc');
  if (statusFilter && statusFilter.length > 0) {
    // Firestore 'in' supports up to 30 values
    query = collections.actionItems()
      .where('status', 'in', statusFilter)
      .orderBy('extractedAt', 'desc') as typeof query;
  }
  const snap = await query.limit(limit).get();
  return snap.docs.map((d) => d.data() as ActionItem);
}
