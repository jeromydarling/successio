# Successio — Claude Code Master Prompt

> **Save this file as `CLAUDE.md` in the root of your project repository.**
> Claude Code reads this file automatically at the start of every session.[^1][^2]
> It loads all skills, agent behaviors, architecture decisions, UI principles, and task context in one place.

***

## 🧠 Agent Identity & Mission

You are **Successio's principal engineering agent**. Your mission is to build a production-grade, multi-vertical SaaS platform that helps retiring small business owners (manufacturing, skilled trades, construction, trucking, agriculture) document their operations, capture tribal knowledge, and generate professional business profiles that make ownership transition possible — connecting sellers to buyers, worker co-ops, CDFIs, and trade association networks.

You operate with **maximum autonomy**. You write code, run tests, fix failures, iterate, and deploy — without asking for permission on implementation details. You ask clarifying questions only when a decision would be **irreversible** or when requirements are genuinely ambiguous.

***

## ⚙️ Loaded Skills (Active for This Session)

### UI / Design Skills
- **shadcn/ui** — Use shadcn components exclusively for all UI primitives (Button, Card, Dialog, Tabs, Form, Input, Table, Badge, Progress, Skeleton, Toast). Never write raw HTML form elements.
- **Tailwind CSS v4** — Utility-first styling. Use CSS variables for theming. No inline styles. No styled-components.
- **Radix UI** — Underlying primitives for all accessible interactive components (dropdowns, modals, tooltips).
- **Lucide React** — Icon system. Import only what you use. Never use emoji as icons in production UI.
- **React 19 / Next.js 15 App Router** — Use Server Components by default. Only add `"use client"` when strictly necessary (event handlers, hooks, browser APIs).
- **Framer Motion** — Subtle animations for upload progress, score reveals, document processing states. Keep animations under 300ms for micro-interactions, 600ms for page transitions.
- **Recharts** — All data visualizations: readiness score gauge, document upload progress, revenue trend charts.
- **React Hook Form + Zod** — All forms use RHF with Zod schema validation. Never use uncontrolled inputs.
- **Tanstack Query v5** — All client-side data fetching, caching, and optimistic updates.
- **next-themes** — Dark/light mode toggle. System preference as default.

### Coding Skills
- **TypeScript strict mode** — `strict: true` in tsconfig. No `any` types. Use `unknown` and narrow. All API responses typed via Zod schemas.
- **Drizzle ORM** — Type-safe D1 queries. All schema in `/src/db/schema.ts`. All migrations via `drizzle-kit`. Never write raw SQL except in migrations.
- **Cloudflare Workers TypeScript** — All server logic runs in Workers runtime (`workerd`). No Node.js-only APIs. Use `cloudflare:workers` types.
- **Hono.js** — API route handler framework for Workers. Typed middleware, grouped routes, Zod validator middleware.
- **tRPC v11** — Type-safe end-to-end API between Next.js Server Components and Workers. No REST for internal calls.
- **Zod** — Single source of truth for all data shapes. Schema → TypeScript type → API validation → DB schema → form validation.
- **Vitest** — Unit and integration tests. All business logic functions have tests. Run `vitest run` before every commit.
- **Playwright** — E2E tests for critical flows: upload → process → view dashboard → generate profile → share link.

### Agent / AI Skills
- **Multi-model orchestration via Cloudflare AI Gateway** — Route all AI calls through AI Gateway. Never call provider APIs directly. Use semantic caching. Implement model fallback chains.[^3][^4]
- **Claude Sonnet 4 (primary extraction)** — Document meaning extraction, SOP generation, business profile drafting. 200k context window. Prompt with `<document>`, `<vertical>`, `<instruction>` XML tags.[^5]
- **Gemini 2.5 Flash (OCR edge cases)** — Handwriting, complex forms, checkbox-heavy documents. Lower cost for secondary pass.[^6]
- **Mistral OCR API (primary OCR)** — All scanned PDFs and images go through Mistral OCR first. 94.89% accuracy on printed docs. ~$1 per 1,000–2,000 pages.[^6]
- **Whisper (via Workers AI)** — Voice-to-text for tribal knowledge capture interviews. Available natively on Cloudflare Workers AI.[^7][^8]
- **Workers AI Embeddings** — Generate embeddings for all extracted text chunks. Store in Vectorize for semantic search across all business documents.[^8]
- **Cloudflare Workflows** — Multi-step async document processing pipelines. Each step is idempotent and retriable. Never use setTimeout for async chains.[^9]
- **Durable Objects** — Per-user processing state. Real-time upload/processing progress. Collaborative deal room access tracking.[^9]
- **Structured output** — All LLM responses use JSON mode or XML-structured prompts. Never parse free-form text. Always validate LLM output through Zod before writing to D1.
- **Confidence scoring** — Every extracted field carries a `confidence: 0-1` float. Fields below 0.7 are flagged for human review in the UI.
- **Prompt versioning** — All prompts live in `/src/prompts/[vertical]/[task].ts`. Prompts are versioned strings, not inline template literals. This enables A/B testing and audit trails.

***

## 🏗️ Architecture

### Stack Overview
```
Frontend:     Next.js 15 (App Router) + React 19 + shadcn/ui + Tailwind v4
Runtime:      Cloudflare Workers (workerd) via OpenNext adapter
Database:     Cloudflare D1 (distributed SQLite) via Drizzle ORM
File Storage: Cloudflare R2 (zero egress cost)
AI Gateway:   Cloudflare AI Gateway (70+ models, caching, fallback)
AI Inference: Workers AI (Whisper, embeddings, lightweight models)
Vector DB:    Cloudflare Vectorize (semantic document search)
Queues:       Cloudflare Queues (document processing jobs)
Pipelines:    Cloudflare Workflows (multi-step orchestration)
State:        Durable Objects (real-time progress, deal room sessions)
Auth:         Cloudflare Zero Trust / custom JWT via Workers KV
Email Ingest: Cloudflare Email Workers (forward documents to ingest pipeline)
CI/CD:        GitHub Actions → Wrangler deploy (automatic on push to main)
Monitoring:   Cloudflare Analytics Engine + Workers Logpush
```

### Project Structure
```
/
├── CLAUDE.md                    ← This file
├── wrangler.toml                ← Cloudflare config (D1, R2, Queues, Workflows, DO)
├── open-next.config.ts          ← OpenNext Cloudflare adapter config
├── drizzle.config.ts            ← Drizzle ORM config pointing to D1
├── src/
│   ├── app/                     ← Next.js App Router pages
│   │   ├── (auth)/              ← Login, signup, invite
│   │   ├── (app)/               ← Authenticated app shell
│   │   │   ├── dashboard/       ← Business health dashboard
│   │   │   ├── upload/          ← Document upload wizard
│   │   │   ├── vault/           ← Document vault + search
│   │   │   ├── knowledge/       ← Tribal knowledge / voice capture
│   │   │   ├── profile/         ← Business profile / deal room
│   │   │   └── settings/        ← Vertical config, integrations
│   │   └── share/[token]/       ← Public-facing deal room (no auth)
│   ├── components/
│   │   ├── ui/                  ← shadcn generated components (never edit)
│   │   ├── upload/              ← UploadWizard, DropZone, FileList
│   │   ├── dashboard/           ← ReadinessScore, MetricCard, ChecklistItem
│   │   ├── vault/               ← DocumentCard, SearchBar, FilterPanel
│   │   ├── knowledge/           ← VoiceCapture, SOPCard, KnowledgeNode
│   │   ├── profile/             ← ProfileSection, ShareModal, AccessTierBadge
│   │   └── shared/              ← Layout, Nav, Breadcrumb, EmptyState, ErrorBoundary
│   ├── server/
│   │   ├── api/                 ← tRPC routers
│   │   │   ├── documents.ts
│   │   │   ├── businesses.ts
│   │   │   ├── knowledge.ts
│   │   │   └── profiles.ts
│   │   └── workers/
│   │       ├── ingest.ts        ← Queue consumer: file type detection + routing
│   │       ├── ocr.ts           ← OCR pipeline (Mistral → Gemini fallback)
│   │       ├── extract.ts       ← Claude extraction pass → structured JSON
│   │       ├── embed.ts         ← Embeddings → Vectorize
│   │       └── score.ts         ← Sale Readiness Score recalculation
│   ├── workflows/
│   │   └── document-pipeline.ts ← Cloudflare Workflow orchestrating all steps
│   ├── db/
│   │   ├── schema.ts            ← Drizzle schema (all tables)
│   │   └── migrations/          ← Auto-generated by drizzle-kit
│   ├── prompts/
│   │   ├── manufacturing/
│   │   │   ├── extract.ts
│   │   │   └── sop.ts
│   │   ├── hvac/
│   │   ├── construction/
│   │   ├── trucking/
│   │   └── agriculture/
│   ├── lib/
│   │   ├── ai-gateway.ts        ← Typed AI Gateway client
│   │   ├── r2.ts                ← R2 upload/download helpers
│   │   ├── ocr.ts               ← OCR orchestration logic
│   │   ├── verticals.ts         ← Vertical config registry
│   │   └── readiness.ts         ← Sale Readiness Score engine
│   └── types/
│       ├── verticals.ts
│       ├── documents.ts
│       └── business.ts
├── tests/
│   ├── unit/
│   └── e2e/
└── migrations/                  ← D1 SQL migrations
```

***

## 🗄️ Database Schema (D1 via Drizzle)

All tables live in `/src/db/schema.ts`. Key tables:

```typescript
// Core entities
organizations        // The business being sold (one per account at MVP)
users                // Owner + invited advisors/buyers
verticals            // manufacturing | hvac | plumbing | construction | trucking | agriculture

// Document pipeline
documents            // Every uploaded file (R2 key, mime type, processing status)
document_chunks      // Extracted text chunks (linked to Vectorize vector IDs)
extracted_entities   // Structured data extracted per document (JSON blob + confidence)

// Business knowledge
customers            // Extracted customer records
equipment            // Extracted equipment/asset records  
processes            // SOP entries (manual or voice-derived)
employees            // Key personnel records
financials           // Extracted P&L / revenue data by year

// Readiness
readiness_scores     // Timestamped score snapshots (0–100)
readiness_checklist  // Per-vertical checklist items + completion status

// Deal room
business_profiles    // Generated CIM-lite documents (JSON structure + PDF R2 key)
share_tokens         // Tiered access tokens (public | nda | full | lender)
share_views          // Audit log of who viewed what and when
```

***

## 📊 Sale Readiness Score Engine

The readiness score lives in `/src/lib/readiness.ts`. It calculates a 0–100 score from weighted checklist completion per vertical. Example weights for manufacturing:

| Category | Weight | Signals |
|---|---|---|
| Customer documentation | 20% | Customer list extracted, revenue by customer, contract status |
| Financial records | 25% | 3 years P&L extractable, job cost data present |
| Operations / SOPs | 20% | Core processes documented, work order system evident |
| Equipment / Assets | 15% | Equipment list with ages, maintenance records |
| People | 10% | Key employee roles documented, org structure clear |
| Legal / Compliance | 10% | Licenses current, certifications documented |

Score recalculates on every successful document extraction. Push to UI via Durable Object → Server-Sent Events.

***

## 🤖 Document Processing Pipeline

### Cloudflare Workflow: `document-pipeline`

```typescript
// Runs in /src/workflows/document-pipeline.ts
// Triggered by: R2 upload event → Cloudflare Queue → Workflow

Step 1: detect_file_type(r2Key)
  → returns: 'pdf' | 'image' | 'spreadsheet' | 'docx' | 'audio' | 'unknown'

Step 2: ocr_if_needed(fileType, r2Key)
  → PDFs with text layer: extract directly
  → Scanned PDFs / images: Mistral OCR API (primary)
  → Handwritten / complex forms: Gemini 2.5 Flash (secondary pass)
  → Cloudflare DLP OCR: lightweight fallback
  → Returns: raw extracted text + page layout metadata

Step 3: extract_entities(rawText, vertical, documentType)
  → Claude Sonnet 4 via AI Gateway
  → Prompt: /src/prompts/{vertical}/extract.ts
  → Returns: validated Zod schema → write to extracted_entities table

Step 4: embed_chunks(documentId, textChunks)
  → Workers AI embeddings (bge-base-en-v1.5)
  → Upsert vectors to Vectorize namespace: org_{orgId}

Step 5: update_readiness_score(orgId)
  → Recalculate from all extracted_entities
  → Write new snapshot to readiness_scores
  → Push update via Durable Object → SSE to dashboard

Step 6: flag_review_items(extractedEntities)
  → Any field with confidence < 0.7 → insert to review queue
  → UI surfaces these as "needs your review" cards
```

### AI Gateway Routing

```typescript
// /src/lib/ai-gateway.ts
// All AI calls use this client — never call provider APIs directly

const gateway = new CloudflareAIGateway({
  accountId: env.CF_ACCOUNT_ID,
  gatewayId: 'successio-prod',
  cache: { type: 'semantic', maxAge: 86400 }, // 24hr semantic cache
})

// Model routing by task
const MODELS = {
  extraction:     'anthropic/claude-sonnet-4',        // primary
  extraction_fb:  'google/gemini-2.5-flash',          // fallback
  ocr_heavy:      'mistral/mistral-ocr-latest',       // scanned docs
  ocr_light:      'google/gemini-2.5-flash',          // handwriting
  embeddings:     '@cf/baai/bge-base-en-v1.5',        // Workers AI native
  transcription:  '@cf/openai/whisper',                // Workers AI native
  profile_draft:  'anthropic/claude-opus-4',          // profile generation
} as const
```

***

## 🎨 UI Design Principles

### Visual Language
- **Palette**: Slate neutrals (background/text), Amber-500 as primary action color (evokes craft, warmth, working-class industry), Green-500 for success/completion states, Red-400 for gaps/missing items
- **Typography**: Inter (sans, body), JetBrains Mono (code/extracted data fields)
- **Density**: Information-dense but not cramped. Cards with clear hierarchy. 16px base spacing grid.
- **Tone**: Serious but approachable. This is not a startup toy — it's a tool for people's life work. No confetti, no growth-hacking dark patterns.

### Key Screen Behaviors

**Upload Wizard** (`/upload`)
- Mobile-first drag-and-drop zone. Large, obvious. Works on phone camera.
- Shows processing status in real-time via SSE from Durable Object.
- File list shows: filename, type icon, OCR confidence badge, extraction status (queued → OCR → extracting → complete → needs review).
- No pagination — virtual scroll for large document sets.

**Dashboard** (`/dashboard`)
- Hero: Readiness Score gauge (Recharts RadialBarChart, animated fill on load).
- Below the fold: Checklist grouped by category. Green checkmarks animate in as documents are processed.
- Right rail: "What to upload next" suggestions based on gaps in checklist.
- Live updates — score and checklist revalidate via Tanstack Query `refetchInterval: false` + manual invalidation on SSE event.

**Document Vault** (`/vault`)
- Grid of document cards. Each shows: thumbnail (R2 presigned URL), extracted entity count, confidence score, vertical tag.
- Global semantic search bar powered by Vectorize. Results ranked by relevance score.
- Filter: by vertical category, by confidence, by extraction status, by document type.
- Click any document → slide-over showing extracted entities, raw OCR text, confidence per field, source page link.

**Knowledge Base** (`/knowledge`)
- Voice capture: large mic button → records in browser → uploads to R2 → Whisper transcription → Claude SOP generation → editable card.
- SOP cards: title, process steps (ordered list), owner, last updated. Inline editing.
- Prompted interview mode: pre-written questions per vertical ("How do you quote a job?", "Who are your three most important customers?", "What breaks most often and how do you fix it?")

**Business Profile / Deal Room** (`/profile`)
- Preview of the generated CIM-lite. Side-by-side: edit mode (JSON form) and rendered preview.
- PDF export button → triggers Claude Opus 4 to draft narrative sections → generates PDF → stores in R2 → presigned download link.
- Share modal: three tiers — Teaser (no financials, public URL), NDA-gated (full data, token link), Lender Package (includes raw extracted financials JSON).
- Access log table: who viewed, when, how long, which sections.

***

## 🏭 Vertical Configuration Registry

```typescript
// /src/lib/verticals.ts
// Each vertical is a config object. Add new verticals here — no code changes elsewhere needed.

export const VERTICALS = {
  manufacturing: {
    label: 'Machine Shop / Manufacturing',
    documentTypes: ['work_order', 'quote', 'job_traveler', 'purchase_order', 'customer_list', 'equipment_list', 'qc_record', 'financial'],
    extractionPrompt: prompts.manufacturing.extract,
    checklistItems: [...],  // 24 items across 6 categories
    profileTemplate: templates.manufacturing,
    associationPartners: ['NTMA', 'PMPA', 'AMT'],
  },
  hvac: { ... },
  plumbing: { ... },
  electrical: { ... },
  construction: { ... },
  trucking: { ... },
  agriculture: { ... },
} as const

export type Vertical = keyof typeof VERTICALS
```

***

## 🚀 Cloudflare Setup & Deployment

### Initial Scaffold Command
```bash
npm create cloudflare@latest successio -- --framework=next
```
This creates the full Next.js 15 + Workers + OpenNext project structure.[^10][^11]

### `wrangler.toml` (complete)
```toml
name = "successio"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "successio-prod"
database_id = "YOUR_D1_ID"

[[r2_buckets]]
binding = "DOCUMENTS"
bucket_name = "successio-documents"

[[vectorize]]
binding = "VECTORS"
index_name = "successio-docs"

[[queues.producers]]
queue = "document-jobs"
binding = "DOCUMENT_QUEUE"

[[queues.consumers]]
queue = "document-jobs"
max_batch_size = 10
max_retries = 3

[ai]
binding = "AI"

[[durable_objects.bindings]]
name = "PROCESSING_STATE"
class_name = "ProcessingStateDO"
script_name = "successio"

[[durable_objects.bindings]]
name = "DEAL_ROOM"
class_name = "DealRoomDO"
script_name = "successio"

[workflows]
[[workflows.workflows]]
name = "document-pipeline"
binding = "DOCUMENT_WORKFLOW"
class_name = "DocumentPipeline"
```

### CI/CD (`.github/workflows/deploy.yml`)
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run test
      - run: npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```

### Real-Time Monitoring
Cloudflare Pages / Workers Analytics shows request volume, CPU time, error rates, and Worker invocations live in the Cloudflare dashboard.[^12][^11] For application-level metrics:
- Use **Cloudflare Analytics Engine** to write custom events (documents processed, OCR confidence distribution, score improvements)
- Use **Workers Logpush** to stream logs to an R2 bucket for debugging
- Dashboard page in app (`/admin/metrics`) queries Analytics Engine via GraphQL API and renders with Recharts

***

## 🔐 Auth & Access Control

### Auth Strategy
- **Cloudflare Zero Trust** (Access) for protecting the admin/internal routes
- **Custom JWT** stored in Workers KV for user sessions. Generated on login, validated in Hono middleware on every API call.
- **Share tokens** for deal room: short UUIDs stored in D1 `share_tokens` table with tier + expiry + view count

### Access Tiers (Deal Room)
```typescript
type ShareTier = 
  | 'public'    // Teaser: name, industry, general description only. No auth required.
  | 'nda'       // Full profile: financials, customer count, process docs. Requires name+email gate.
  | 'lender'    // Raw extracted data JSON + all documents. For CDFIs and SBA lenders.
  | 'buyer'     // Full access + can request specific documents. For vetted buyers.
```

***

## 🧪 Testing Requirements

Before any feature is considered complete:

1. **Unit tests (Vitest)**: All extraction logic, readiness score calculation, prompt builders, Zod schema validation
2. **Integration tests (Vitest + Miniflare)**: Queue consumer, Workflow steps, D1 write/read cycles
3. **E2E tests (Playwright)**:
   - Happy path: upload PDF → wait for processing → dashboard score updates → generate profile → share link works
   - Error path: upload corrupted file → graceful error state → retry works
   - Auth: unauthenticated user cannot access app routes; can access public share link
4. Run `wrangler dev` locally and verify all bindings before deploying.[^10]

***

## 📋 MVP Build Sequence

Follow this exact order. Do not start a new phase until the previous one passes tests and deploys successfully.

### Phase 1 — Foundation (Week 1–2)
- [ ] Scaffold with `create-cloudflare` + Next.js 15 framework
- [ ] Configure `wrangler.toml` with all bindings (D1, R2, Queues, Vectorize, Workflows, DOs)
- [ ] Drizzle schema: `organizations`, `users`, `documents` tables
- [ ] shadcn init + Tailwind v4 config + color tokens
- [ ] Auth: signup/login with JWT, session stored in KV
- [ ] Basic app shell: nav, sidebar, route structure
- [ ] R2 upload endpoint: presigned URL generation → direct browser upload → trigger queue
- [ ] Cloudflare Queue consumer: receive job, detect file type, log status
- [ ] **Deploy to Cloudflare. Verify live.**

### Phase 2 — OCR + Extraction (Week 3–4)
- [ ] Mistral OCR integration via AI Gateway
- [ ] Gemini 2.5 Flash fallback for handwriting
- [ ] Workers AI Whisper for audio/video files
- [ ] Claude Sonnet 4 extraction pass with manufacturing vertical prompt
- [ ] Zod validation of LLM output → D1 write
- [ ] Confidence scoring per field
- [ ] Vectorize embeddings for semantic search
- [ ] Document vault UI: list view, status badges, slide-over detail
- [ ] **Deploy and test with real scanned documents.**

### Phase 3 — Intelligence Layer (Week 5–6)
- [ ] Readiness Score engine + D1 snapshot writes
- [ ] Durable Object for per-org processing state
- [ ] SSE endpoint streaming processing progress to frontend
- [ ] Dashboard: Readiness Score gauge, animated checklist, "upload next" suggestions
- [ ] Semantic search bar (Vectorize query → ranked results)
- [ ] All 7 verticals added to config registry (prompts can be stubs — flesh out post-MVP)
- [ ] **Deploy and validate score accuracy with real business data.**

### Phase 4 — Knowledge Capture (Week 7–8)
- [ ] Voice capture: browser MediaRecorder → R2 → Whisper → Claude SOP → D1
- [ ] SOP card UI with inline editing
- [ ] Prompted interview mode (per-vertical question sets)
- [ ] Knowledge base view: search, filter, export
- [ ] Manual entity entry forms (for things AI can't extract)
- [ ] **Deploy and run voice capture test.**

### Phase 5 — Deal Room (Week 9–10)
- [ ] Claude Opus 4 business profile drafter (narrative sections from structured data)
- [ ] PDF generation (server-side, store in R2)
- [ ] Profile editor: JSON form ↔ rendered preview
- [ ] Share token generation: tier selection, expiry, copy link
- [ ] Public share page (`/share/[token]`) — no auth required, renders tier-appropriate view
- [ ] Access audit log: view events written to D1 on every share page load
- [ ] NDA gate: name + email capture before showing NDA tier
- [ ] **Deploy. Share a real profile link. Test all three tiers.**

### Phase 6 — Association Layer (Week 11–12)
- [ ] Multi-tenant white-labeling: association logo + color in `wrangler.toml` env vars
- [ ] Association admin portal: see all member orgs, aggregate readiness metrics
- [ ] Communis integration: "Explore worker co-op acquisition" CTA on profile page → deep link
- [ ] CDFI/lender package export: bundled ZIP of profile PDF + raw financials JSON + document originals
- [ ] NTMA pilot: deploy white-labeled instance at `ntma.successio.app`
- [ ] **Production launch.**

***

## 🔄 Working Conventions

### Git Workflow
- Branch naming: `feat/phase-1-auth`, `fix/ocr-timeout`, `chore/update-deps`
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Never commit directly to `main`. All merges via PR with passing CI.
- `main` auto-deploys via GitHub Actions on merge.[^13]

### Error Handling
- All Workers functions use `try/catch` with structured error logging to Analytics Engine
- Queues use dead-letter queue for failed jobs. Failed documents surface in vault with "processing failed — retry" state.
- All AI Gateway calls have timeout (30s) and automatic retry (3x) configured at gateway level.[^4]
- Never throw unhandled promise rejections. All async Workers functions are wrapped.

### Environment Variables
```bash
# In .dev.vars (local) and Cloudflare dashboard (production)
ANTHROPIC_API_KEY=sk-...
MISTRAL_API_KEY=...
GOOGLE_AI_API_KEY=...
CF_ACCOUNT_ID=...
CF_AI_GATEWAY_ID=successio-prod
JWT_SECRET=...
ENCRYPTION_KEY=...   # For PII fields in D1
```

### Claude Code Behavior Rules
- **Think before writing**. For any task involving >3 files, write a brief plan as a comment at the top of your response before writing code.
- **Run tests automatically**. After implementing any feature, run `vitest run` and fix failures before stopping.
- **Preview before deploy**. Always run `npm run preview` (wrangler dev via workerd runtime) before `npm run deploy`.[^10]
- **Never hardcode secrets**. All credentials via `env` binding. Fail loudly if env var is missing.
- **Validate LLM output**. Never trust AI-generated JSON without Zod parse. If parse fails, log and route to manual review queue — never crash the pipeline.
- **Idempotent pipelines**. Every Workflow step checks if it has already run (via D1 status field) before executing. Re-running a pipeline on the same document should be safe.
- **Keep Workers small**. If a Worker file exceeds 300 lines, extract helpers into `/src/lib/`. Workers should orchestrate, not implement.

***

## 🔗 Key External Documentation

Always fetch live docs before implementing integrations (do not rely on training data for APIs):

- Cloudflare Workers AI models: `https://developers.cloudflare.com/workers-ai/models/`[^14]
- Cloudflare AI Gateway: `https://developers.cloudflare.com/ai-gateway/`[^4]
- Cloudflare Workflows: `https://developers.cloudflare.com/workflows/`
- Cloudflare D1 + Drizzle: `https://developers.cloudflare.com/d1/`
- Next.js on Workers (OpenNext): `https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/`[^10]
- Mistral Document AI: `https://docs.mistral.ai/studio-api/document-processing/overview`[^15]
- Claude PDF/Vision: `https://platform.claude.com/docs/en/build-with-claude/pdf-support`[^16]
- Cloudflare Vectorize: `https://developers.cloudflare.com/vectorize/`
- shadcn/ui components: `https://ui.shadcn.com/docs/components`
- Drizzle + D1: `https://orm.drizzle.team/docs/get-started/d1-new`

***

*Successio — Helping blue-collar owners pass the torch. Built on Cloudflare, powered by AI, distributed through the associations that workers already trust.*

---

## References

1. [Make A Comprehensive Claude...](https://matsen.fhcrc.org/general/2025/10/30/agentic-coding-principles.html) - An understanding of how coding agents work can guide us about how best to use them.

2. [Agentic Coding Best Practices with Claude Code - Tessl](https://tessl.io/blog/claude-code-best-practices/) - Working with Claude Code introduces a new dev workflow: write a spec, spin up agentic bots, and retu...

3. [Cloudflare Unifies AI Model Access | StartupHub.ai](https://www.startuphub.ai/ai-news/technology/2026/cloudflare-unifies-ai-model-access) - Cloudflare's AI Gateway now unifies access to over 70 AI models from multiple providers via a single...

4. [Overview · Cloudflare AI Gateway docs](https://developers.cloudflare.com/ai-gateway/) - Observe and control your AI applications with analytics, caching, rate limiting, and model fallback ...

5. [Corporate clairvoyant](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) - Comprehensive guide to prompt engineering techniques for Claude's latest models, covering clarity, e...

6. [Mistral OCR vs. Gemini Flash 2.0: Comparing VLM OCR Accuracy](https://reducto.ai/blog/lvm-ocr-accuracy-mistral-gemini) - Mistral's new OCR API — parses 1000-2000 pages for $1 — achieves state of the art results on tables,...

7. [Changelog](https://developers.cloudflare.com/changelog/2025-03-17-new-workers-ai-models/) - New text-to-speech, reranker, whisper, embeddings models now available!

8. [Overview · Cloudflare Workers AI docs](https://developers.cloudflare.com/workers-ai/) - Workers AI allows you to run AI models in a serverless way, without having to worry about scaling, m...

9. [Cloudflare Workers in 2025: from edge to enterprise - Jacar](https://jacar.es/en/cloudflare-workers-2025/) - For small or mid-sized SaaS, with D1 as the database and R2 as storage, you can cover almost the who...

10. [Next.js · Cloudflare Workers docs](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/) - Next.js is a React framework for building full stack applications. Next.js supports Server-side and ...

11. [Your frontend, backend, and database — now in one Cloudflare ...](https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/) - These new additions allow you to build and host projects ranging from simple static sites to full-st...

12. [Developer Week Day 2: Fullstack on Cloudflare](https://cloudflare.tv/shows/developer-week/developer-week-day-2-fullstack-on-cloudflare/wv2R1Xvk) - So I have that built on top of Cloudflare using workers, do all my image storage in R2, and I use D1...

13. [How to Deploy a Full-Stack Next.js App on Cloudflare Workers with ...](https://www.freecodecamp.org/news/how-to-deploy-a-full-stack-next-js-app-on-cloudflare-workers-with-github-actions-ci-cd/) - Step 1 — Install the Cloudflare Adapter · Step 2 — Wire OpenNext into next dev · Step 3 — Local Envi...

14. [Workers AI Models - Cloudflare Docs](https://developers.cloudflare.com/workers-ai/models/)

15. [Document AI - Mistral Docs](https://docs.mistral.ai/studio-api/document-processing/overview) - Documentation for the deployment and usage of Mistral AI's LLMs

16. [PDF support - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/pdf-support) - Process PDFs with Claude. Extract text, analyze charts, and understand visual content from your docu...

---

## 🔑 API Key Registry

> **This section is the canonical home for all API keys and secrets — keep it at the very end of this file.**
> **NEVER paste real secret values here.** This table is the *registry* (what exists, where it lives, who issues it). Real values live only in `.dev.vars` (local, gitignored) and Cloudflare encrypted secrets (production via `wrangler secret put <NAME>`). The app must fail loudly if any required key is missing — never hardcode a fallback.

| Key | Purpose | Where set (local → prod) | Issuer / Console | Status |
|---|---|---|---|---|
| `ANTHROPIC_API_KEY` | Claude extraction + profile drafting (via AI Gateway) | `.dev.vars` → `wrangler secret` | console.anthropic.com | ⬜ not set |
| `MISTRAL_API_KEY` | Primary OCR for scanned docs | `.dev.vars` → `wrangler secret` | console.mistral.ai | ⬜ not set |
| `GOOGLE_AI_API_KEY` | Gemini 2.5 Flash OCR/extraction fallback | `.dev.vars` → `wrangler secret` | aistudio.google.com | ⬜ not set |
| `CF_ACCOUNT_ID` | Cloudflare account scope for AI Gateway | `.dev.vars` → `[vars]` / dashboard | dash.cloudflare.com | ⬜ not set |
| `CF_AI_GATEWAY_ID` | AI Gateway id (`successio-prod`) | `wrangler.toml [vars]` | dash.cloudflare.com → AI Gateway | ✅ `successio-prod` |
| `JWT_SECRET` | Signs/validates user session JWTs (Workers KV) | `.dev.vars` → `wrangler secret` | self-generated (`openssl rand -hex 32`) | ⬜ not set |
| `ENCRYPTION_KEY` | Encrypts PII fields at rest in D1 | `.dev.vars` → `wrangler secret` | self-generated (`openssl rand -hex 32`) | ⬜ not set |

**Conventions**
- New keys get added to this table **and** to `.dev.vars.example`. Update the **Status** column when a key is provisioned.
- Cloudflare *bindings* (`DB`, `DOCUMENTS`, `VECTORS`, `AI`, `DOCUMENT_QUEUE`, Durable Objects, Workflows) are not secrets — they live in `wrangler.toml`, not here.
- Provisioning of D1 / R2 / Vectorize / KV / AI Gateway is done through the **Cloudflare MCP server** (see below) rather than by hand. Always confirm before creating billable resources.

