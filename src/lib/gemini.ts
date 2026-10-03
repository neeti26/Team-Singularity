/**
 * Gemini client singleton + shared helpers
 * Uses @google/generative-ai SDK with Gemini 1.5 Pro
 */
import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
} from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Safety settings — balanced for enterprise content
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

/** Return a Gemini 1.5 Pro model instance with custom generation config */
export function getGeminiModel(config?: Partial<GenerationConfig>): GenerativeModel {
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.2,       // Low temp for factual extraction
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
      ...config,
    },
  });
}

/** Return a fast Gemini 1.5 Flash model for cheaper/faster tasks */
export function getGeminiFlashModel(config?: Partial<GenerationConfig>): GenerativeModel {
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.3,
      topP: 0.85,
      topK: 40,
      maxOutputTokens: 4096,
      ...config,
    },
  });
}

/**
 * Generate a text embedding for a string using Gemini's text-embedding model.
 * Returns a 768-dimension float array.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

/** Simple cosine similarity between two equal-length vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Parse JSON safely from Gemini output that may be wrapped in markdown fences */
export function parseGeminiJson<T>(raw: string): T {
  // Strip ```json ... ``` or ``` ... ``` fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return JSON.parse(cleaned) as T;
}
