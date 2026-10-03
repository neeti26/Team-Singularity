# Team Singularity — AI Organizational Memory Agent

> **AI Builder Cup 2026 · Theme: Future of Work & Enterprise Productivity**
> Built by **Team Singularity** · Powered by **Gemini 1.5 Pro** · Deployed on **Google Cloud Run + Firestore**

---

## The Problem

Every team loses knowledge constantly.

Decisions made in Monday's meeting are forgotten by Friday. Action items agreed in a Slack thread are never tracked. A new engineer spends two weeks re-discovering context that exists in a PDF nobody can find. An important vendor decision made six months ago is unknowingly reversed because it wasn't recorded anywhere searchable.

This isn't a knowledge *creation* problem — teams create plenty of content. It's a knowledge *retention and retrieval* problem. Existing solutions are either too heavyweight (Confluence, Notion) requiring manual curation, or too shallow (search tools) that can't synthesise across documents.

**Team Singularity solves this with a four-agent AI system that automatically extracts, indexes, and makes your organisation's institutional memory queryable in natural language.**

---

## What It Does

```
Upload any document  →  Gemini extracts decisions + action items  →  Ask anything in chat
```

| Feature | Description |
|---|---|
| **Document Ingestion** | Upload PDFs, DOCX, TXT, Markdown, or Slack JSON exports |
| **Decision Extraction** | Automatically pulls every decision, who made it, and the outcome |
| **Action Item Tracking** | Extracts tasks with assignees, due dates, and priority levels |
| **Natural Language Q&A** | Ask *"What did we decide about the API vendor?"* — get cited answers |
| **Nudge Agent** | Generates human, empathetic reminders for overdue tasks using Gemini |
| **Live Dashboard** | Stats, activity feed, and at-a-glance org health |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                         │
│   Dashboard │ Upload │ Chat │ Action Items │ Decisions │ Nudges  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│                   Next.js API Routes (Cloud Run)                  │
│  /api/ingest  /api/chat  /api/action-items  /api/nudge           │
│  /api/decisions  /api/stats                                       │
└──┬────────────────────────────────────────────────────┬──────────┘
   │                                                    │
   ▼                                                    ▼
┌──────────────────────────────┐          ┌─────────────────────────┐
│      Multi-Agent Pipeline    │          │    Google Cloud          │
│                              │          │                          │
│  ┌─────────────────────────┐ │          │  ┌───────────────────┐  │
│  │    IngestionAgent       │ │          │  │   Firestore        │  │
│  │  • Chunk documents      │ │◄────────►│  │  • documents      │  │
│  │  • text-embedding-004   │ │          │  │  • chunks         │  │
│  │  • Store in Firestore   │ │          │  │  • embeddings     │  │
│  └─────────────────────────┘ │          │  │  • decisions      │  │
│                              │          │  │  • actionItems    │  │
│  ┌─────────────────────────┐ │          │  │  • chatSessions   │  │
│  │   ExtractionAgent       │ │          │  │  • nudgeLogs      │  │
│  │  • Extract decisions    │ │          │  └───────────────────┘  │
│  │  • Extract action items │ │          │                          │
│  │  • Structured prompting │ │          │  ┌───────────────────┐  │
│  └─────────────────────────┘ │          │  │  Secret Manager   │  │
│                              │          │  │  (API keys)       │  │
│  ┌─────────────────────────┐ │          │  └───────────────────┘  │
│  │       QAAgent           │ │          │                          │
│  │  • Embed user query     │ │          │  ┌───────────────────┐  │
│  │  • Cosine similarity    │◄├──────────┤  │  Cloud Build CI/CD│  │
│  │  • RAG synthesis        │ │          │  └───────────────────┘  │
│  │  • Cite sources         │ │          │                          │
│  └─────────────────────────┘ │          └─────────────────────────┘
│                              │
│  ┌─────────────────────────┐ │          ┌─────────────────────────┐
│  │      NudgeAgent         │ │          │   Gemini 1.5 Pro API     │
│  │  • Staleness detection  │◄├─────────►│   text-embedding-004     │
│  │  • Urgency scoring      │ │          │   Gemini 1.5 Flash       │
│  │  • Human-tone messages  │ │          └─────────────────────────┘
│  └─────────────────────────┘ │
└──────────────────────────────┘
```

### Agent Responsibilities

| Agent | Model | Task |
|---|---|---|
| **IngestionAgent** | `text-embedding-004` + Flash | Chunks documents (1500 char / 200 overlap), generates 768-dim embeddings, tags chunks |
| **ExtractionAgent** | Gemini 1.5 Pro | Structured extraction of decisions and action items via zero-shot JSON prompting |
| **QAAgent** | Gemini 1.5 Pro + `text-embedding-004` | Embeds query → cosine similarity search → retrieves top-8 chunks → synthesises cited answer |
| **NudgeAgent** | Gemini 1.5 Flash | Scores urgency of open tasks, generates personalised reminder messages |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **AI Models** | Gemini 1.5 Pro, Gemini 1.5 Flash, text-embedding-004 |
| **AI Platform** | Google AI Studio / Gemini API (`@google/generative-ai`) |
| **Database** | Cloud Firestore (NoSQL, real-time) |
| **Deployment** | Google Cloud Run (containerised, auto-scaling) |
| **CI/CD** | Cloud Build (`cloudbuild.yaml`) |
| **Secrets** | Google Secret Manager |
| **Auth** | Firebase Authentication |
| **File parsing** | `pdf-parse`, `mammoth` (DOCX), native JSON |

---

## Project Structure

```
Team-Singularity/
├── src/
│   ├── agents/
│   │   ├── ingestion-agent.ts    # Chunk + embed documents
│   │   ├── extraction-agent.ts   # Extract decisions + action items
│   │   ├── qa-agent.ts           # RAG Q&A pipeline
│   │   ├── nudge-agent.ts        # Proactive task nudging
│   │   └── orchestrator.ts       # Pipeline coordinator + stats
│   ├── app/
│   │   ├── api/
│   │   │   ├── ingest/route.ts   # POST upload / GET list / DELETE
│   │   │   ├── chat/route.ts     # POST Q&A / GET sessions
│   │   │   ├── action-items/     # GET / PATCH / DELETE
│   │   │   ├── decisions/        # GET with search
│   │   │   ├── nudge/route.ts    # POST trigger / GET recent
│   │   │   └── stats/route.ts    # GET dashboard stats
│   │   ├── dashboard/page.tsx    # Org intelligence overview
│   │   ├── upload/page.tsx       # Document upload + library
│   │   ├── chat/page.tsx         # RAG chat interface
│   │   ├── action-items/page.tsx # Task tracker
│   │   ├── decisions/page.tsx    # Decision log
│   │   └── nudges/page.tsx       # Nudge agent control panel
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ActionItemsTable.tsx
│   │   ├── UploadZone.tsx
│   │   └── StatCard.tsx
│   ├── lib/
│   │   ├── gemini.ts             # Gemini client + embedding + cosine similarity
│   │   ├── firebase-admin.ts     # Server-side Firestore
│   │   ├── firebase-client.ts    # Browser Firebase
│   │   └── document-parser.ts   # PDF/DOCX/TXT/JSON extraction
│   └── types/index.ts            # Shared TypeScript types
├── Dockerfile                    # Multi-stage Node 20 Alpine image
├── cloudbuild.yaml               # CI/CD pipeline
├── deploy.sh                     # One-command deployment
├── setup-secrets.sh              # Secret Manager bootstrap
├── firebase.json                 # Firebase hosting config
├── firestore.rules               # Firestore security rules
└── firestore.indexes.json        # Composite index definitions
```

---

## Judging Criteria Alignment

### Technical Merit & Gen AI Implementation (40%)
- **4 specialised Gemini agents** with distinct responsibilities, not a single monolithic prompt
- **RAG pipeline**: `text-embedding-004` for semantic embedding, cosine similarity retrieval, Gemini 1.5 Pro for synthesis
- **Structured extraction**: zero-shot JSON prompting for reliable decision/action-item parsing
- **Deployed on Cloud Run** with multi-stage Docker build, Secret Manager, and Cloud Build CI/CD
- **Firestore** with 7 composite indexes for efficient querying

### Problem Alignment & Impact (25%)
- Every knowledge-worker team loses institutional memory — this is a universal, painful problem
- SMEs and startups can't afford enterprise knowledge management platforms (Guru, Tettra cost $10–20/user/month)
- Team Singularity's AI turns existing documents into a searchable, queryable brain at zero marginal cost beyond API calls
- Proactive nudging prevents tasks from falling through the cracks — a measurable productivity impact

### Innovation & Creativity (25%)
- **The Nudge Agent** — most tools extract tasks but none generate contextual, human-toned reminders using LLMs
- **Source citations in chat** — every answer links back to the source document and excerpt (trust + verifiability)
- **Multi-format ingestion** — PDFs, DOCX, meeting transcripts, Slack JSON exports in one pipeline
- **Intent classification** — QA agent detects whether you're asking about a decision, action item, or general fact and retrieves from the right data source

### User Experience (10%)
- Clean dark-themed dashboard with live statistics
- Drag-and-drop upload with per-file processing feedback
- Chat interface with suggested questions and streaming-style UX
- Inline status updates on action items — no context switching

---

## Local Development Setup

### Prerequisites
- Node.js 20+
- A Google AI Studio API key (free at [aistudio.google.com](https://aistudio.google.com))
- A Firebase project (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/neeti26/Team-Singularity.git
cd Team-Singularity
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Fill in your keys — see below
```

**Minimum required for local development:**
```env
GEMINI_API_KEY=your_key_from_aistudio.google.com

# Firebase (create project at console.firebase.google.com)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (download service account JSON from Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Set up Firestore

In the [Firebase Console](https://console.firebase.google.com):
1. Create a Firestore database in **Native mode**
2. Choose region `asia-southeast1` (Singapore)
3. Deploy indexes: `firebase deploy --only firestore:indexes`

### 4. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Try it out

1. Go to **Upload Docs** → drag in a meeting transcript (plain `.txt` works great)
2. Go to **Dashboard** → see extracted stats
3. Go to **Ask Singularity AI** → ask *"What decisions were made?"*
4. Go to **Action Items** → see extracted tasks
5. Go to **Nudges** → click **Run Agent** to generate nudge messages

---

## Cloud Run Deployment

### First time

```bash
# 1. Set your project
export GCP_PROJECT_ID=your-gcp-project-id

# 2. Create Secret Manager secrets from your .env.local
chmod +x setup-secrets.sh
./setup-secrets.sh

# 3. Deploy
chmod +x deploy.sh
./deploy.sh
```

### Subsequent deployments

```bash
./deploy.sh
# Or push to main branch — Cloud Build triggers automatically
```

### Set up Cloud Build trigger (optional CI/CD)

```bash
gcloud builds triggers create github \
  --repo-name=Team-Singularity \
  --repo-owner=neeti26 \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

---

## Sample Documents to Test

Drop any of these into the upload page:

**Meeting transcript (paste as `.txt`):**
```
Q3 Planning Meeting — September 15, 2026
Attendees: Sarah Chen, Marcus Rivera, Priya Patel

After discussion, we decided to migrate our authentication service to Firebase Auth by October 31st.
Sarah will lead the migration and Marcus will handle the documentation.

Action items:
- Sarah Chen: Complete auth service migration by Oct 31 [HIGH]
- Marcus Rivera: Update developer docs by Nov 7 [MEDIUM]
- Priya Patel: Security audit of new auth flow by Oct 25 [CRITICAL]

We also agreed to sunset the legacy API v1 endpoints on December 1st.
The decision was made to use Google Cloud Run for all new services going forward.
```

After uploading, ask in chat:
- *"What decisions were made in the Q3 planning meeting?"*
- *"Who is doing the security audit and when is it due?"*
- *"What is being deprecated in December?"*

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ingest` | Upload documents (multipart/form-data) |
| `GET` | `/api/ingest` | List all uploaded documents |
| `DELETE` | `/api/ingest?id=<id>` | Delete document + all derived data |
| `POST` | `/api/chat` | Send a message, get RAG answer |
| `GET` | `/api/chat` | List chat sessions |
| `GET` | `/api/chat?sessionId=<id>` | Get chat session messages |
| `GET` | `/api/action-items` | List action items (filter by status/assignee) |
| `PATCH` | `/api/action-items` | Update action item status |
| `GET` | `/api/decisions` | List decisions (search + tag filter) |
| `POST` | `/api/nudge` | Run nudge agent |
| `GET` | `/api/nudge` | Get recent nudge messages |
| `GET` | `/api/stats` | Dashboard statistics |

---

## Hackathon Submission Checklist

- [x] Working prototype deployed on Google Cloud Run
- [x] Integrates Gemini 1.5 Pro and text-embedding-004
- [x] Uses Firestore (Firebase) for persistence
- [x] Multi-agent agentic architecture
- [x] PDF/DOCX/TXT/Slack document ingestion
- [x] Natural language Q&A with source citations (RAG)
- [x] Automatic decision extraction
- [x] Automatic action item extraction with assignees + due dates
- [x] Proactive nudge agent for overdue tasks
- [x] Live dashboard with org statistics
- [x] TypeScript throughout — production-quality code
- [x] Security: Secret Manager, Firestore rules, non-root container
- [x] CI/CD: Cloud Build pipeline (`cloudbuild.yaml`)
- [ ] Record 3-minute demo video (see script below)

---

## Demo Video Script (3 minutes)

**0:00–0:20 — Hook**
> "Every team I've worked on has had this problem: decisions get made, things get agreed, and then they disappear. Team Singularity is an AI that remembers everything so you don't have to."

**0:20–0:50 — Upload**
Show dragging a meeting transcript PDF into the upload zone. Show the per-file processing feedback and the summary Gemini generates.

**0:50–1:30 — Dashboard**
Show the stats updating — documents, decisions, action items. Click through to the Decision Log, highlight a specific decision with its context and outcome.

**1:30–2:10 — Chat (the wow moment)**
Ask: *"What decisions were made about the API and who is responsible for follow-up?"*
Show the answer appearing with source citations, including document names and excerpts.

**2:10–2:40 — Action Items + Nudge**
Show the Action Items table with priority badges. Click "Run Nudge Agent" — show the generated messages appearing, each one sounding natural and specific to the task.

**2:40–3:00 — Architecture + Close**
> "This runs on Google Cloud Run, uses Gemini 1.5 Pro for extraction and Q&A, text-embedding-004 for semantic search, and Firestore for storage. Four specialised agents, one unified memory for your team."

---

## Team

**Team Singularity** — AI Builder Cup 2026, JAPAC region.

Theme: **Future of Work & Enterprise Productivity**

GitHub: [https://github.com/neeti26/Team-Singularity](https://github.com/neeti26/Team-Singularity)

---

*"The best knowledge management tool is one that works without anyone managing it."*
