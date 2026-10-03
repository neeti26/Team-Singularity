/**
 * IngestionAgent
 * ──────────────
 * Responsibility: Receive raw document text, split into semantic chunks,
 * generate embeddings for each chunk, and persist to Firestore.
 *
 * This is the first agent in the pipeline.
 */
import { v4 as uuidv4 } from 'uuid';
import { getGeminiFlashModel, generateEmbedding, parseGeminiJson } from '@/lib/gemini';
import { db, collections } from '@/lib/firebase-admin';
import type { UploadedDocument, KnowledgeChunk } from '@/types';

// ── Chunking config ───────────────────────────────────────────
const CHUNK_SIZE   = 1500; // characters
const CHUNK_OVERLAP = 200; // characters

interface ChunkMeta {
  content: string;
  index: number;
}

/** Split text into overlapping chunks of ~CHUNK_SIZE characters */
function splitIntoChunks(text: string): ChunkMeta[] {
  const chunks: ChunkMeta[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push({ content: text.slice(start, end).trim(), index });
    start += CHUNK_SIZE - CHUNK_OVERLAP;
    index++;
  }
  return chunks.filter((c) => c.content.length > 50); // drop tiny tail chunks
}

/** Use Gemini Flash to extract semantic tags for a chunk */
async function extractTags(chunkContent: string): Promise<string[]> {
  const model = getGeminiFlashModel({ maxOutputTokens: 256 });
  const prompt = `Extract 3–6 concise keyword tags from this text that describe its main topics.
Return ONLY a JSON array of lowercase strings, no explanation.

Text:
"""
${chunkContent.slice(0, 800)}
"""

Tags:`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    return parseGeminiJson<string[]>(raw);
  } catch {
    return [];
  }
}

/** Generate a one-paragraph summary of the full document */
export async function generateDocumentSummary(text: string, docType: string): Promise<string> {
  const model = getGeminiFlashModel({ temperature: 0.4, maxOutputTokens: 512 });
  const prompt = `You are an expert at summarising ${docType} documents for a business knowledge base.
Produce a concise 2–3 sentence summary of the key points in this document.
Be specific: mention people, dates, and outcomes if present.

Document (first 3000 chars):
"""
${text.slice(0, 3000)}
"""

Summary:`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ── Main agent function ───────────────────────────────────────

export interface IngestionResult {
  documentId: string;
  chunksCreated: number;
  summary: string;
}

export async function runIngestionAgent(
  rawText: string,
  docMeta: Pick<UploadedDocument, 'id' | 'name' | 'type' | 'uploadedBy'>
): Promise<IngestionResult> {
  const documentId = docMeta.id;

  // 1. Generate document summary
  const summary = await generateDocumentSummary(rawText, docMeta.type);

  // 2. Split into chunks
  const rawChunks = splitIntoChunks(rawText);

  // 3. Process chunks in batches of 5 (respect API rate limits)
  const BATCH_SIZE = 5;
  const persistedChunks: KnowledgeChunk[] = [];

  for (let i = 0; i < rawChunks.length; i += BATCH_SIZE) {
    const batch = rawChunks.slice(i, i + BATCH_SIZE);

    const processed = await Promise.all(
      batch.map(async ({ content, index }) => {
        const [embedding, tags] = await Promise.all([
          generateEmbedding(content),
          extractTags(content),
        ]);

        const chunk: KnowledgeChunk = {
          id: uuidv4(),
          documentId,
          documentName: docMeta.name,
          content,
          embedding,
          tags,
          createdAt: new Date().toISOString(),
        };
        return chunk;
      })
    );

    persistedChunks.push(...processed);
  }

  // 4. Batch-write chunks to Firestore
  const FIRESTORE_BATCH = 400; // Firestore limit is 500 ops per batch
  for (let i = 0; i < persistedChunks.length; i += FIRESTORE_BATCH) {
    const batch = db.batch();
    const slice = persistedChunks.slice(i, i + FIRESTORE_BATCH);
    for (const chunk of slice) {
      const ref = collections.chunks().doc(chunk.id);
      // Store embedding separately to keep chunk doc lean
      const { embedding, ...chunkWithoutEmbedding } = chunk;
      batch.set(ref, chunkWithoutEmbedding);

      // Store embedding in separate collection
      const embRef = collections.embeddings().doc(chunk.id);
      batch.set(embRef, { chunkId: chunk.id, documentId, embedding });
    }
    await batch.commit();
  }

  // 5. Update document record with summary and status
  await collections.documents().doc(documentId).update({
    status: 'processed',
    summary,
    chunkCount: persistedChunks.length,
    processedAt: new Date().toISOString(),
  });

  return {
    documentId,
    chunksCreated: persistedChunks.length,
    summary,
  };
}
