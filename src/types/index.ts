// ── Document types ────────────────────────────────────────────

export type DocumentType = 'meeting_transcript' | 'email' | 'slack_export' | 'document' | 'other';

export interface UploadedDocument {
  id: string;
  name: string;
  type: DocumentType;
  content: string;          // raw extracted text
  uploadedAt: string;       // ISO timestamp
  uploadedBy: string;
  status: 'processing' | 'processed' | 'failed';
  chunkCount?: number;
  summary?: string;
}

// ── Knowledge chunks ──────────────────────────────────────────

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  embedding?: number[];     // stored in Firestore or future vector store
  tags: string[];
  createdAt: string;
}

// ── Decisions ─────────────────────────────────────────────────

export interface Decision {
  id: string;
  documentId: string;
  documentName: string;
  title: string;
  description: string;
  decisionDate: string;     // when it was made (extracted or inferred)
  madeBy: string[];         // names extracted from text
  context: string;
  outcome: string;
  tags: string[];
  extractedAt: string;
}

// ── Action Items ───────────────────────────────────────────────

export type ActionItemStatus = 'open' | 'in_progress' | 'completed' | 'overdue';
export type ActionItemPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ActionItem {
  id: string;
  documentId: string;
  documentName: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string | null;
  status: ActionItemStatus;
  priority: ActionItemPriority;
  extractedAt: string;
  lastNudgedAt: string | null;
  completedAt: string | null;
}

// ── Chat ──────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  sources?: SourceReference[];
  agentUsed?: string;
}

export interface SourceReference {
  documentId: string;
  documentName: string;
  excerpt: string;
  relevanceScore: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ── Org Stats ─────────────────────────────────────────────────

export interface OrgStats {
  totalDocuments: number;
  totalDecisions: number;
  totalActionItems: number;
  openActionItems: number;
  overdueActionItems: number;
  documentsThisWeek: number;
  recentActivity: ActivityEvent[];
}

export interface ActivityEvent {
  id: string;
  type: 'document_uploaded' | 'decision_extracted' | 'action_item_created' | 'nudge_sent';
  description: string;
  timestamp: string;
}

// ── API response helpers ───────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface IngestResponse {
  documentId: string;
  chunksCreated: number;
  decisionsExtracted: number;
  actionItemsExtracted: number;
  summary: string;
}

export interface ChatResponse {
  message: ChatMessage;
  sessionId: string;
}
