/**
 * Mock data for demo / development mode.
 * Used when Firebase credentials are not configured.
 * Set NEXT_PUBLIC_USE_MOCK=true in .env.local to enable.
 */
import type { OrgStats, Decision, ActionItem } from '@/types';

export const MOCK_STATS: OrgStats = {
  totalDocuments:     24,
  totalDecisions:     61,
  totalActionItems:   138,
  openActionItems:    43,
  overdueActionItems: 7,
  documentsThisWeek:  6,
  recentActivity: [
    { id: '1', type: 'document_uploaded',   description: '"Q3 Engineering Retrospective.pdf" uploaded — 12 decisions, 34 action items extracted', timestamp: new Date(Date.now() - 12 * 60000).toISOString() },
    { id: '2', type: 'nudge_sent',          description: 'Nudge Agent generated 5 reminders for overdue tasks', timestamp: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: '3', type: 'decision_extracted',  description: '"Migrate auth to Firebase Auth by Oct 31" extracted from Sprint Planning Notes', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: '4', type: 'action_item_created', description: '"Security audit of new auth flow" assigned to Priya Patel — due Oct 25 [CRITICAL]', timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: '5', type: 'document_uploaded',   description: '"Vendor Contract Review — Oct 2026.docx" uploaded — 8 decisions extracted', timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: '6', type: 'nudge_sent',          description: 'Marcus Rivera nudged: "API documentation" task 2 days overdue', timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
    { id: '7', type: 'decision_extracted',  description: '"Sunset API v1 on December 1st" agreed in Q3 Planning Meeting', timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
  ],
};

export const MOCK_DECISIONS: Decision[] = [
  {
    id: 'd1', documentId: 'doc1', documentName: 'Q3 Engineering Retrospective.pdf',
    title: 'Migrate authentication to Firebase Auth',
    description: 'After evaluating Auth0, Cognito, and Firebase Auth, the team decided to proceed with Firebase Auth for its seamless integration with our existing Google Cloud infrastructure.',
    decisionDate: '2026-09-15',
    madeBy: ['Sarah Chen', 'Marcus Rivera', 'Priya Patel'],
    context: 'Our legacy auth system had 3 security incidents in Q2 and maintenance burden was increasing.',
    outcome: 'Firebase Auth migration to be completed by October 31st, 2026. Sarah Chen leading.',
    tags: ['authentication', 'security', 'firebase', 'infrastructure'],
    extractedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'd2', documentId: 'doc1', documentName: 'Q3 Engineering Retrospective.pdf',
    title: 'Sunset legacy API v1 endpoints',
    description: 'All v1 API endpoints will be deprecated and removed on December 1st. Partners have been given 90 days notice.',
    decisionDate: '2026-09-15',
    madeBy: ['Sarah Chen', 'Alex Kumar'],
    context: 'API v1 has been maintained alongside v2 for 18 months at significant engineering cost.',
    outcome: 'API v1 sunset on December 1st 2026. Migration guide to be published by Marcus Rivera by Nov 1st.',
    tags: ['api', 'deprecation', 'engineering'],
    extractedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'd3', documentId: 'doc2', documentName: 'Vendor Contract Review — Oct 2026.docx',
    title: 'Switch cloud infrastructure to Google Cloud Run',
    description: 'All new services to be deployed on Google Cloud Run instead of self-managed Kubernetes.',
    decisionDate: '2026-10-01',
    madeBy: ['Priya Patel', 'Sarah Chen'],
    context: 'Kubernetes management overhead consuming 30% of DevOps capacity.',
    outcome: 'New service template updated. Existing services migrated on a rolling basis by Q1 2027.',
    tags: ['infrastructure', 'cloud-run', 'google-cloud', 'devops'],
    extractedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'd4', documentId: 'doc3', documentName: 'Product Roadmap H2 2026.pdf',
    title: 'Launch AI-powered search in Q4',
    description: 'The team voted to prioritise AI search over the mobile app redesign for Q4 2026.',
    decisionDate: '2026-09-20',
    madeBy: ['Alex Kumar', 'Jamie Osei'],
    context: 'Customer surveys showed 67% wanted better search; only 31% wanted mobile redesign.',
    outcome: 'AI search feature flagged for December release. Gemini API integration approved.',
    tags: ['product', 'ai', 'search', 'q4'],
    extractedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

export const MOCK_ACTION_ITEMS: ActionItem[] = [
  {
    id: 'a1', documentId: 'doc1', documentName: 'Q3 Engineering Retrospective.pdf',
    title: 'Complete auth service migration to Firebase Auth',
    description: 'Full migration of authentication service including user data, session management, and OAuth providers.',
    assignee: 'Sarah Chen', dueDate: '2026-10-31', status: 'in_progress', priority: 'high',
    extractedAt: new Date(Date.now() - 2 * 3600000).toISOString(), lastNudgedAt: null, completedAt: null,
  },
  {
    id: 'a2', documentId: 'doc1', documentName: 'Q3 Engineering Retrospective.pdf',
    title: 'Security audit of new Firebase Auth flow',
    description: 'Conduct full penetration testing and security review before go-live.',
    assignee: 'Priya Patel', dueDate: '2026-10-25', status: 'overdue', priority: 'critical',
    extractedAt: new Date(Date.now() - 2 * 3600000).toISOString(), lastNudgedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: null,
  },
  {
    id: 'a3', documentId: 'doc1', documentName: 'Q3 Engineering Retrospective.pdf',
    title: 'Update developer documentation for API v1 deprecation',
    description: 'Write migration guide, update changelog, notify all API consumers.',
    assignee: 'Marcus Rivera', dueDate: '2026-11-07', status: 'open', priority: 'medium',
    extractedAt: new Date(Date.now() - 2 * 3600000).toISOString(), lastNudgedAt: null, completedAt: null,
  },
  {
    id: 'a4', documentId: 'doc3', documentName: 'Product Roadmap H2 2026.pdf',
    title: 'Implement Gemini API integration for AI search',
    description: 'Build the search indexing pipeline using Gemini embeddings and integrate with product UI.',
    assignee: 'Alex Kumar', dueDate: '2026-12-01', status: 'open', priority: 'high',
    extractedAt: new Date(Date.now() - 48 * 3600000).toISOString(), lastNudgedAt: null, completedAt: null,
  },
  {
    id: 'a5', documentId: 'doc2', documentName: 'Vendor Contract Review — Oct 2026.docx',
    title: 'Create Cloud Run service deployment template',
    description: 'Standardise Cloud Run configuration: Dockerfile, cloudbuild.yaml, env vars, Secret Manager.',
    assignee: 'Priya Patel', dueDate: '2026-10-20', status: 'overdue', priority: 'high',
    extractedAt: new Date(Date.now() - 5 * 3600000).toISOString(), lastNudgedAt: null, completedAt: null,
  },
  {
    id: 'a6', documentId: 'doc3', documentName: 'Product Roadmap H2 2026.pdf',
    title: 'Conduct user interviews for AI search UX',
    description: 'Interview 10 power users to validate search UI concepts before engineering begins.',
    assignee: 'Jamie Osei', dueDate: '2026-11-15', status: 'open', priority: 'medium',
    extractedAt: new Date(Date.now() - 48 * 3600000).toISOString(), lastNudgedAt: null, completedAt: null,
  },
];
