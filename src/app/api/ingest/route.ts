/**
 * POST /api/ingest
 * ─────────────────
 * Accepts a multipart/form-data upload with one or more documents.
 * Runs them through the full multi-agent pipeline:
 *   1. Parse text from PDF / DOCX / TXT / JSON
 *   2. IngestionAgent  → chunks + embeddings → Firestore
 *   3. ExtractionAgent → decisions + action items → Firestore
 *
 * Returns a summary of what was extracted.
 */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 }              from 'uuid';
import { collections }               from '@/lib/firebase-admin';
import { extractTextFromBuffer, detectDocumentType } from '@/lib/document-parser';
import { processPipeline }           from '@/agents/orchestrator';
import type { ApiResponse, IngestResponse, UploadedDocument } from '@/types';

export const runtime = 'nodejs';       // required for pdf-parse / mammoth
export const maxDuration = 300;        // 5-minute timeout for large docs

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files    = formData.getAll('files') as File[];
    const uploadedBy = (formData.get('uploadedBy') as string) || 'anonymous';

    if (!files || files.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'No files provided.' },
        { status: 400 }
      );
    }

    const results: IngestResponse[] = [];
    const errors:  { file: string; error: string }[] = [];

    for (const file of files) {
      try {
        // 1. Read file buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer      = Buffer.from(arrayBuffer);

        // 2. Extract text
        const rawText = await extractTextFromBuffer(buffer, file.type, file.name);

        if (!rawText || rawText.trim().length < 20) {
          errors.push({ file: file.name, error: 'Could not extract readable text from this file.' });
          continue;
        }

        // 3. Build document metadata record
        const docId: string = uuidv4();
        const docType       = detectDocumentType(file.name, file.type);

        const doc: UploadedDocument = {
          id:         docId,
          name:       file.name,
          type:       docType,
          content:    rawText.slice(0, 5000), // store preview only (full text in chunks)
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          status:     'processing',
        };

        // 4. Persist initial record
        await collections.documents().doc(docId).set(doc);

        // 5. Run full pipeline (ingest + extract)
        const pipelineResult = await processPipeline(rawText, {
          id: docId,
          name: file.name,
          type: docType,
          uploadedBy,
        });

        results.push(pipelineResult);
      } catch (fileErr) {
        const msg = fileErr instanceof Error ? fileErr.message : 'Unknown error';
        errors.push({ file: file.name, error: msg });
        // Mark document as failed if it was created
      }
    }

    return NextResponse.json<ApiResponse<{ results: IngestResponse[]; errors: typeof errors }>>({
      success: true,
      data: { results, errors },
    });
  } catch (err) {
    console.error('[/api/ingest] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/** GET /api/ingest — List all uploaded documents */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const snap = await collections.documents()
      .orderBy('uploadedAt', 'desc')
      .limit(limit)
      .get();

    const docs = snap.docs.map((d) => {
      const data = d.data() as UploadedDocument;
      // Strip full content for listing (saves bandwidth)
      return { ...data, content: data.content?.slice(0, 300) + '…' };
    });

    return NextResponse.json<ApiResponse<UploadedDocument[]>>({
      success: true,
      data: docs,
    });
  } catch (err) {
    console.error('[GET /api/ingest] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to list documents.' },
      { status: 500 }
    );
  }
}

/** DELETE /api/ingest?id=<docId> — Remove a document and its chunks */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('id');
    if (!docId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Missing document id.' },
        { status: 400 }
      );
    }

    const batch = collections.documents().firestore.batch();

    // Delete document
    batch.delete(collections.documents().doc(docId));

    // Delete chunks
    const chunksSnap = await collections.chunks()
      .where('documentId', '==', docId)
      .get();
    chunksSnap.docs.forEach((d) => batch.delete(d.ref));

    // Delete embeddings
    const embSnap = await collections.embeddings()
      .where('documentId', '==', docId)
      .get();
    embSnap.docs.forEach((d) => batch.delete(d.ref));

    // Delete decisions
    const decSnap = await collections.decisions()
      .where('documentId', '==', docId)
      .get();
    decSnap.docs.forEach((d) => batch.delete(d.ref));

    // Delete action items
    const aiSnap = await collections.actionItems()
      .where('documentId', '==', docId)
      .get();
    aiSnap.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();

    return NextResponse.json<ApiResponse<{ deleted: string }>>({
      success: true,
      data: { deleted: docId },
    });
  } catch (err) {
    console.error('[DELETE /api/ingest] Error:', err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to delete document.' },
      { status: 500 }
    );
  }
}
