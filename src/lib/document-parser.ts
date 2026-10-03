/**
 * Document parser utilities
 * Extracts raw text from PDF, DOCX, TXT, and plain text uploads.
 * Runs server-side only (Node.js).
 */

/** Extract text from a Buffer based on MIME type */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<string> {
  const mime = mimeType.toLowerCase();

  // ── Plain text / markdown ──────────────────────────────────
  if (
    mime.includes('text/plain') ||
    mime.includes('text/markdown') ||
    filename.endsWith('.txt') ||
    filename.endsWith('.md')
  ) {
    return buffer.toString('utf-8');
  }

  // ── PDF ────────────────────────────────────────────────────
  if (mime.includes('application/pdf') || filename.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  // ── DOCX ───────────────────────────────────────────────────
  if (
    mime.includes('application/vnd.openxmlformats-officedocument.wordprocessingml') ||
    filename.endsWith('.docx')
  ) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // ── JSON (Slack export) ───────────────────────────────────
  if (mime.includes('application/json') || filename.endsWith('.json')) {
    const json = JSON.parse(buffer.toString('utf-8'));
    return flattenSlackExport(json);
  }

  // ── Fallback: try as UTF-8 text ───────────────────────────
  return buffer.toString('utf-8');
}

/** Flatten a Slack export JSON array into readable text */
function flattenSlackExport(json: unknown): string {
  if (!Array.isArray(json)) {
    return JSON.stringify(json, null, 2);
  }
  return json
    .map((msg: Record<string, unknown>) => {
      const ts   = msg.ts ? new Date(Number(msg.ts) * 1000).toISOString() : '';
      const user = msg.user || msg.username || 'Unknown';
      const text = msg.text || '';
      return `[${ts}] ${user}: ${text}`;
    })
    .join('\n');
}

/** Detect document type from filename / mime */
export function detectDocumentType(
  filename: string,
  mimeType: string
): 'meeting_transcript' | 'email' | 'slack_export' | 'document' | 'other' {
  const lower = filename.toLowerCase();
  if (lower.includes('transcript') || lower.includes('meeting') || lower.includes('minutes'))
    return 'meeting_transcript';
  if (lower.includes('email') || lower.includes('mail') || mimeType.includes('message'))
    return 'email';
  if (lower.includes('slack') || lower.endsWith('.json'))
    return 'slack_export';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.doc')
  )
    return 'document';
  return 'other';
}
