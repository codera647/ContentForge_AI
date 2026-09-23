# ContentForge AI — Product Requirements Document (PRD)

> This document describes the **actual, implemented** system. Every feature listed
> here exists in the codebase and has been verified against the running application.

---

## 1. Product Overview

ContentForge AI is a Generative AI content platform for marketing teams and solo
marketers. It generates on-brand marketing copy — LinkedIn posts, X/Twitter posts,
Instagram captions, Facebook posts, marketing emails, ad copy, product descriptions
and blog posts — using configurable **brand voice profiles**, and manages the
resulting content through a library, a repurposing engine, and a monthly
scheduling calendar.

**Core flow:** Create Brand → Configure Brand Voice → Generate Content →
Edit/Save → Repurpose → Schedule → View on Calendar.

## 2. Problem Statement

Marketing content must sound consistently like the brand it represents, yet be
produced quickly and in many formats. Generic AI chat produces one generic voice
and no workflow: drafts live in documents, repurposing is manual copy-editing,
and scheduling lives in a separate tool. ContentForge AI unifies voice, generation,
repurposing and scheduling in one system where the brand profile is a first-class
input to every generation.

## 3. Goals

1. **Content quality** — structured prompts (Role → Brand Context → Task →
   Constraints) with format-specific craft notes.
2. **Brand consistency** — every brand field, including preferred/avoided
   phrases and example copy, is injected into every prompt.
3. **Output diversity** — multi-variation generation uses distinct strategies
   (Direct / Story-driven / Educational), not paraphrasing.
4. **User controls** — brand, topic, audience, objective, tone, length, keywords,
   CTA and 1–3 variations per generation.
5. **Performance** — parallel variation generation; a single deployable Next.js app.

Non-goals (v1): publishing directly to social networks, team accounts/permissions,
analytics.

## 4. Target Users

- **Solo marketers / founders** who produce their own content across platforms.
- **Small marketing teams** maintaining one or several brand voices.
- **Agencies** managing multiple client brands from one workspace.

## 5. User Journeys

**Journey 1 — First brand & first post.** User opens Brand Voice → Add Brand,
fills the 11-field profile (identity, voice, values, preferred/avoided phrases,
writing style, example content) → Create Content, selects the brand, a format and
a topic → hits Generate → 2–3 distinct variations appear → edits one, copies it,
and the piece is already saved to the Library as a Draft.

**Journey 2 — Repurpose.** User opens a saved blog post in the Library → clicks
Repurpose → picks Instagram Caption → the dialog shows original and repurposed
side-by-side → the new piece is saved as a linked Draft preserving the brand voice.

**Journey 3 — Plan the month.** User schedules content to specific dates/times
with a platform → opens the Calendar → sees items on their days, navigates months,
clicks an item to preview, edit or unschedule it (which returns it to Draft).

## 6. Functional Requirements

| # | Requirement | Status |
|---|---|---|
| FR1 | Create/edit/delete brand profiles with 11 voice fields | ✅ `/brands` |
| FR2 | Brand fields are included in AI prompts | ✅ `buildBrandContext()` |
| FR3 | Generate content in 8 formats | ✅ `/create` |
| FR4 | Controls: brand, topic, audience, objective, tone, length, keywords, CTA, 1–3 variations | ✅ |
| FR5 | Variations differ in hook, structure, wording and CTA | ✅ strategy system |
| FR6 | Edit, copy, save, regenerate, generate variations, schedule | ✅ workspace + library |
| FR7 | Convert content between formats preserving brand voice | ✅ `/api/repurpose` |
| FR8 | Library: search, filter (format/status/brand), edit, delete, duplicate | ✅ `/library` |
| FR9 | Statuses: Draft, Scheduled, Published, Archived | ✅ enum + badges |
| FR10 | Monthly calendar with scheduled items on date/time | ✅ `/calendar` |
| FR11 | Dashboard: totals, recent, upcoming, quick actions | ✅ `/` |
| FR12 | Loading, empty, success and error states throughout | ✅ |

## 7. AI Requirements

- Provider-agnostic layer (`src/lib/ai/provider.ts`): **OpenAI-compatible** and
  **Anthropic** clients behind one `AiProvider` interface; selected via
  `AI_PROVIDER` (or auto-detected from the key present). `mock` provider for
  offline/CI use.
- Requests time out at 90s; provider failures surface as HTTP 502 with a generic
  message (details logged server-side only).
- JSON output schema (`{title, body}`) enforced by a tolerant parser
  (`parseAiJson`) that handles markdown fences and surrounding prose, with
  validation via zod.

## 8. Brand Voice System

Each brand profile carries: name, description, industry, target audience,
personality, tone, brand values, preferred phrases, phrases to avoid, writing
style, and example content. `buildBrandContext()` renders all of it into the
prompt, including an explicit **NEVER use** instruction for avoided phrases and a
"match rhythm and diction, do not copy" instruction for example content.
Verified behavior: contrasting brands produce noticeably different output for the
same request.

## 9. Content Generation

- Prompt structure: **Role** (expert copywriter) → **Brand Context** →
  **Content Task** (format with craft notes, topic, audience, objective, tone) →
  **Approach** (strategy) → **Constraints** (length guidance, keywords, CTA,
  JSON-only output) → **Output Schema**.
- Length guidance: short ≈ 50–100 words, medium ≈ 150–300, long ≈ 500–900.
- Variations run **in parallel**, each with a distinct strategy and per-strategy
  temperature (direct 0.7 / story 0.9 / educational 0.8).

## 10. Content Calendar

Monthly grid (Monday-first, 6 weeks), prev/next/today navigation. Items render on
their day with time + title; past-due pending items are amber-flagged. Clicking an
item opens a popover: full content preview, edit schedule, unschedule (reverts
content to Draft), open in library. Scheduling sets content status to Scheduled;
multiple items per day stack cleanly.

## 11. Technical Architecture

- **Next.js 16 (App Router) + TypeScript** — single full-stack app; server-only
  API routes under `src/app/api/*`; no AI logic in UI components.
- **Tailwind CSS v4** — dark SaaS UI, responsive (sidebar collapses to a mobile
  drawer), skeleton loaders, toasts.
- **Prisma ORM** — schema in `prisma/schema.prisma`, migrations committed.
- **Layer boundaries:** `src/lib/ai/` (provider / prompt-builder / generators /
  validation / types), `src/lib/prisma.ts` (DB access), `src/lib/client.ts`
  (typed fetch + shared client types), `src/components/*` (UI only).

## 12. Database Design

- **User** — id (cuid), unique Clerk user ID, unique email, optional profile
  fields, and timestamps. The Clerk ID is the runtime identity key.
- **Brand** — belongs to User (cascade); 11 voice fields (lists as JSON);
  has many Content.
- **Content** — belongs to User; optional Brand (SetNull on brand delete);
  `format` enum (8 values); `status` enum (draft/scheduled/published/archived);
  generation metadata (topic, audience, objective, tone, keywords JSON, cta);
  `sourceContentId` self-relation for repurposed copies; `variationIndex`;
  has many ScheduledContent.
- **ScheduledContent** — belongs to Content and User (cascade);
  `platform` enum; `scheduledAt` datetime; `status` enum
  (pending/published/cancelled). Indexes on `(userId, scheduledAt)` and `contentId`.
- **AiUsage** — one row per user and UTC day, with an atomic operation counter
  shared by generation and repurposing.

## 13. API Design

| Method & path | Purpose |
|---|---|
| `POST /api/generate` | Generate 1–3 variations; `save:true` persists them as drafts |
| `POST /api/repurpose` | Convert saved content to another format; creates linked draft |
| `GET/POST /api/brands`, `GET/PATCH/DELETE /api/brands/[id]` | Brand CRUD |
| `GET /api/content` | List with `q`, `format`, `status`, `brandId`, pagination |
| `GET/PATCH/DELETE /api/content/[id]` | Detail, update, delete |
| `POST /api/content/[id]` | Duplicate as new draft |
| `GET/POST /api/schedule`, `PATCH/DELETE /api/schedule/[id]` | Schedule CRUD + calendar range queries |
| `GET /api/stats` | Dashboard counts, recent, upcoming, AI provider status |

Error contract: `400` validation (with `fieldErrors`) or missing API key, `401`
unauthenticated, `404` not found/inaccessible, `409` brand or identity conflict,
`429` daily AI quota, `502` provider failure / invalid AI response, `500` unexpected.

## 14. Security

- Clerk middleware protects application pages, and every API route independently
  calls `requireCurrentUser()` before accessing data.
- First login creates or safely links one Prisma user by verified primary email;
  the legacy seed user is explicitly excluded from login linking.
- Brand, content, schedule, dashboard, and AI-usage queries include the current
  Prisma `userId`. Inaccessible IDs return generic not-found responses.
- A supplied `brandId`, source content ID, schedule ID, or content ID is accepted
  only when it belongs to the authenticated user.
- Brand creation is limited to 3 per user in a serializable transaction. AI
  generation and repurposing share an atomic 50-operation UTC daily limit.
- API keys are read only server-side (`process.env` in API routes); the Settings
  page shows provider status and a masked placeholder only — the key never
  reaches the client.
- All request bodies validated with zod; Prisma parameterizes all SQL.
- No credentials in the repo (`.env` is gitignored; `.env.example` documents keys).

## 15. Performance

- Variations generate concurrently (`Promise.all`).
- DB: indexed queries for library filters and calendar ranges; paginated listing.
- Server components for static pages (dashboard shell, calendar grid), client
  islands for interactive forms; production build prerenders 16 routes.

## 16. Acceptance Criteria

- Brand CRUD works end-to-end; brand voice measurably changes output.
- Generation returns 1–3 structurally different variations; invalid input → 400
  with field errors; missing key → actionable 400.
- Saved content appears in Library; search/filters correct; edit/delete/duplicate/copy work.
- Repurposing creates a linked draft in the target format; same-format blocked.
- Scheduling puts content on the correct calendar day; unscheduling reverts status.
- Dashboard counts are live; quick actions navigate to working flows.
- New Clerk users receive isolated workspaces and cannot access another user's
  resources by guessing IDs.
- The fourth brand and the 51st daily AI operation are rejected server-side.
- `npm run build` and `npm test` pass; no hardcoded secrets.

## 17. Testing Strategy

- **Unit and API tests (Vitest, 54 tests):** prompt-builder (section order, brand-field
  injection, avoided phrases, strategy divergence, format notes), validation
  (schemas + tolerant AI-JSON parser), generators (strategy assignment,
  variation counts, mock provider), Clerk-to-Prisma identity resolution,
  ownership/IDOR behavior, and brand/AI limit boundaries.
- **Integration (verified via API against the live app):** generate → save →
  list → duplicate → repurpose → schedule → calendar range → unschedule;
  error paths (bad format, short topic, same-format repurpose, missing key).
- **Browser/E2E:** manual pass over all pages incl. responsive layout.

## 18. Known Limitations

- Scheduling is planning-only — nothing is published to external networks.
- "Published" status is manual (set in the editor).
- JSON-list fields (keywords, phrases) are untyped at the DB level (Prisma `Json`).
- No streaming; long blog generations wait for the full response.
- Workspaces are individual; team roles and shared workspaces are not implemented.
- Accepted AI operations consume quota even when the provider later fails. Provider
  retries within that operation do not consume additional quota.

## 19. Future Improvements

- Team roles and intentionally shared workspaces.
- Scheduled publisher worker (cron) to flip pending → published and optionally
  post via platform APIs.
- Streaming generation UI; per-variation regenerate with a chosen strategy.
- Brand voice analytics (which phrases/tones perform best).
- Team review workflow with comments and approval states.
