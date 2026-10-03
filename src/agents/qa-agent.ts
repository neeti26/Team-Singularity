/**
 * QAAgent (Retrieval-Augmented Generation)
 * ─────────────────────────────────────────
 * Responsibility: Answer natural language questions about the organisation's
 * knowledge base by:
 *   1. Embedding the user query
 *   2. Finding the most semantically similar chunks (vector search)
 *   3. Synthesising an answer from retrieved context using Gemini 1.5 Pro
 *   4. Returning the answer with source references
 *
 * This agent deliberately cites its sources so users can verify answers.
 */
import { getGeminiModel, generateEmbedding, cosineSimilarity } from '@/lib/gemini';
import { collections } from '@/lib/firebase-admin';
import type { ChatMessage, SourceReference } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const TOP_K = 8; // number of chunks to retrieve

// ── Vector retrieval ──────────────────────────────────────────

interface StoredEmbedding {
  chunkId: string;
  documentId: string;
  embedding: number[];
}

interface RetrievedChunk {
  chunkId:      string;
  documentId:   string;
  documentName: string;
  content:      string;
  score:        number;
}

async function retrieveRelevantChunks(queryEmbedding: number[]): Promise<RetrievedChunk[]> {
  // Load all embeddings — for a production system this would use
  // Vertex AI Vector Search; for the hackathon prototype Firestore works fine
  // with <10k documents.
  const embSnap = await collections.embeddings().limit(2000).get();

  const scored: Array<{ chunkId: string; documentId: string; score: number }> = [];

  for (const doc of embSnap.docs) {
    const data = doc.data() as StoredEmbedding;
    if (!data.embedding || data.embedding.length === 0) continue;
    const score = cosineSimilarity(queryEmbedding, data.embedding);
    scored.push({ chunkId: data.chunkId, documentId: data.documentId, score });
  }

  // Sort descending and take top K
  scored.sort((a, b) => b.score - a.score);
  const topK = scored.slice(0, TOP_K);

  // Fetch chunk content
  const results: RetrievedChunk[] = [];
  for (const { chunkId, documentId, score } of topK) {
    const chunkDoc = await collections.chunks().doc(chunkId).get();
    if (!chunkDoc.exists) continue;
    const data = chunkDoc.data()!;
    results.push({
      chunkId,
      documentId,
      documentName: data.documentName || 'Unknown document',
      content:      data.content     || '',
      score,
    });
  }

  return results;
}

// ── Intent classification ─────────────────────────────────────

type QueryIntent = 'factual' | 'decision' | 'action_item' | 'summary' | 'general';

async function classifyIntent(query: string): Promise<QueryIntent> {
  const lower = query.toLowerCase();
  if (/action item|task|assigned|to-do|follow.?up|who is responsible/i.test(lower))
    return 'action_item';
  if (/decid|decision|agreed|approved|chosen|selected/i.test(lower))
    return 'decision';
  if (/summar|overview|highlights|recap|what happened/i.test(lower))
    return 'summary';
  if (/what|who|when|where|how many|list/i.test(lower))
    return 'factual';
  return 'general';
}

// ── Structured query for decisions & action items ─────────────

async function queryDecisions(query: string): Promise<string> {
  const snap = await collections.decisions().limit(100).get();
  if (snap.empty) return '';
  const decisions = snap.docs.map((d) => d.data());
  return decisions
    .map((d) => `[${d.decisionDate}] ${d.title}: ${d.outcome} (from: ${d.documentName})`)
    .join('\n');
}

async function queryActionItems(query: string): Promise<string> {
  const snap = await collections.actionItems()
    .where('status', 'in', ['open', 'in_progress', 'overdue'])
    .limit(100)
    .get();
  if (snap.empty) return '';
  const items = snap.docs.map((d) => d.data());
  return items
    .map(
      (i) =>
        `[${i.priority.toUpperCase()}] ${i.title} — Assignee: ${i.assignee}, Due: ${i.dueDate || 'No date'}, Status: ${i.status}`
    )
    .join('\n');
}

// ── Answer synthesis ──────────────────────────────────────────

export interface QAResult {
  answer:  string;
  sources: SourceReference[];
  intent:  QueryIntent;
}

export async function runQAAgent(
  query: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<QAResult> {
  const model = getGeminiModel({ temperature: 0.3 });

  // 1. Classify intent
  const intent = await classifyIntent(query);

  // 2. Retrieve relevant context
  const [queryEmbedding] = await Promise.all([generateEmbedding(query)]);
  const chunks = await retrieveRelevantChunks(queryEmbedding);

  // 3. Add structured data for specific intents
  let structuredContext = '';
  if (intent === 'decision' || intent === 'general') {
    const decisionsText = await queryDecisions(query);
    if (decisionsText) {
      structuredContext += `\n\n--- DECISIONS DATABASE ---\n${decisionsText}`;
    }
  }
  if (intent === 'action_item' || intent === 'general') {
    const aiText = await queryActionItems(query);
    if (aiText) {
      structuredContext += `\n\n--- ACTION ITEMS DATABASE ---\n${aiText}`;
    }
  }

  // 4. Build context string from chunks
  const contextBlocks = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}: ${c.documentName}]\n${c.content}`
    )
    .join('\n\n---\n\n');

  // 5. Build conversation history string
  const historyStr = conversationHistory
    .slice(-6) // last 3 turns
    .map((m) => `${m.role === 'user' ? 'User' : 'Singularity AI'}: ${m.content}`)
    .join('\n');

  // 6. Generate answer
  const systemPrompt = `You are Singularity AI, an intelligent organizational memory assistant built by Team Singularity.
You have access to the company's documents, meeting transcripts, emails, and knowledge base.
Answer questions accurately and concisely. Always cite which document your answer comes from.
If you cannot find relevant information in the provided context, say so clearly — never hallucinate facts.
Format lists and action items clearly. Use markdown for structure when helpful.`;

  const fullPrompt = `${systemPrompt}

${historyStr ? `Conversation so far:\n${historyStr}\n\n` : ''}Retrieved context from knowledge base:
${contextBlocks}
${structuredContext}

User question: ${query}

Answer (cite source documents):`;

  const result = await model.generateContent(fullPrompt);
  const answer = result.response.text().trim();

  // 7. Build source references for top chunks with score > 0.3
  const sources: SourceReference[] = chunks
    .filter((c) => c.score > 0.3)
    .slice(0, 4)
    .map((c) => ({
      documentId:     c.documentId,
      documentName:   c.documentName,
      excerpt:        c.content.slice(0, 200) + (c.content.length > 200 ? '…' : ''),
      relevanceScore: Math.round(c.score * 100) / 100,
    }));

  return { answer, sources, intent };
}

/** Build a ChatMessage from a QA result */
export function buildAssistantMessage(result: QAResult): ChatMessage {
  return {
    id:         uuidv4(),
    role:       'assistant',
    content:    result.answer,
    timestamp:  new Date().toISOString(),
    sources:    result.sources,
    agentUsed:  'QAAgent',
  };
}
