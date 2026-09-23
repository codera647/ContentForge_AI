# ContentForge AI

A full-stack **Generative AI content platform**: generate marketing copy,
blog posts and social content with configurable **brand voices**, repurpose
content between formats, and plan it on a monthly **content calendar**.

> 📄 Product documentation: [`docs/PRD.md`](docs/PRD.md)

## Features

- **Brand Voice profiles** — 11 fields (identity, personality, tone, values,
  preferred/avoided phrases, writing style, example copy) injected into every AI
  prompt, so different brands produce noticeably different writing.
- **AI content generation** — 8 formats: LinkedIn, X/Twitter, Instagram,
  Facebook, marketing email, ad copy, product description, blog post. Controls
  for brand, topic, audience, objective, tone, length, keywords, CTA and 1–3
  variations.
- **Genuine output diversity** — variations use distinct strategies
  (Direct / Story-driven / Educational) with different hooks, structure and CTA.
- **Repurposing** — convert any saved piece to another format while preserving
  the brand voice; the result is saved as a linked draft.
- **Content Library** — search, filter by format/status/brand, edit, copy,
  delete, duplicate, repurpose, schedule. Statuses: Draft / Scheduled /
  Published / Archived.
- **Content Calendar** — monthly grid; scheduled items appear on their
  date/time with platform and title; edit/unschedule from the calendar.
- **Dashboard** — live counts (content, drafts, scheduled, brands), recent
  content, upcoming scheduled, quick actions.
- **Authenticated workspaces** — Clerk sign-up/sign-in with server-side Prisma
  user resolution and ownership isolation across every API resource.
- **Server-enforced limits** — up to 3 brands and 50 generation/repurpose
  operations per user per UTC day.
- Calm, editorial light UI (warm neutrals + serif reading canvas), fully
  responsive, with loading / empty / success / error states throughout.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS v4 |
| Database | PostgreSQL (via Prisma ORM) |
| Authentication | Clerk |
| AI | Pluggable provider layer — OpenAI-compatible or Anthropic (server-side only) |
| Tests | Vitest (54 unit and API authorization tests) |

## Architecture

```
Browser ──> Clerk middleware ──> Next.js App Router
                                  ├── public/authenticated UI route groups
                                  └── src/app/api/* route handlers
                                        ├── requireCurrentUser()
                                        ├── ownership-scoped Prisma queries
                                        ├── AI provider + atomic usage limits
                                        └── Neon PostgreSQL
```

The AI layer is provider-switchable via env vars; no secrets ever reach the client.

## Folder Structure

```
├── docs/PRD.md                  Product requirements (actual implementation)
├── prisma/schema.prisma         User · Brand · Content · ScheduledContent · AiUsage
├── prisma/migrations/           Committed SQL migrations
├── src/
│   ├── app/
│   │   ├── page.tsx             Dashboard
│   │   ├── create/              Generation workspace
│   │   ├── library/             Content library + [id] editor
│   │   ├── calendar/            Monthly calendar
│   │   ├── brands/              Brand voice list / new / edit
│   │   ├── settings/            Provider status
│   │   └── api/                 generate · repurpose · brands · content · schedule · stats
│   ├── components/              Sidebar, forms, dialogs, UI primitives
│   └── lib/
│       ├── ai/                  provider, prompt-builder, generators, validation, types
│       ├── auth.ts              Clerk-to-Prisma identity resolution
│       ├── limits.ts            Brand and daily AI limits
│       ├── prisma.ts            DB client
│       ├── client.ts            Typed API client + shared types
│       └── constants.ts         Formats, tones, strategies
├── tests/                       Vitest unit tests
├── .env.example
└── README.md
```

## Environment Variables

Copy `.env.example` → `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon **pooled** Postgres connection — used by Prisma Client / the running app |
| `DIRECT_URL` | ✅ | Neon **direct** Postgres connection — used by the Prisma CLI for migrations |
| `AI_PROVIDER` | – | `openai` \| `anthropic` \| `mock`. Empty = auto-detect from the key present |
| `OPENAI_API_KEY` | if openai | Any OpenAI-compatible key |
| `OPENAI_MODEL` | – | Default `gpt-4o` |
| `OPENAI_BASE_URL` | – | Point at an OpenAI-compatible gateway |
| `ANTHROPIC_API_KEY` | if anthropic | Anthropic key |
| `ANTHROPIC_MODEL` | – | Default `claude-sonnet-4-20250514` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key used by the browser |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key; server-side only |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ✅ | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ✅ | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | ✅ | `/dashboard` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | ✅ | `/dashboard` |

Set `AI_PROVIDER=mock` to run the whole app offline with a deterministic
template provider (great for CI).

## Installation

```bash
git clone https://github.com/codera647/ContentForge_AI.git contentforge-ai
cd contentforge-ai
npm install
cp .env.example .env        # then edit .env
npx prisma migrate deploy   # or: npx prisma migrate dev
npm run db:seed             # optional: demo user + 4 demo brand voices
npm run dev                 # http://localhost:3000
```

## Database Setup

- **Recommended (production):** create a free Postgres at
  [Neon](https://neon.tech), [Supabase](https://supabase.com) or Railway and put
  the URL in `DATABASE_URL`.
- **Local Postgres:** `createdb contentforge` and set
  `postgresql://postgres:postgres@localhost:5432/contentforge`.
- **Local MariaDB/MySQL** (as used in this repo's dev container): set
  `provider = "mysql"` in `prisma/schema.prisma` and a `mysql://…` URL. The
  models are identical for both engines.

Apply schema changes:

```bash
npx prisma migrate dev      # create + apply a migration (dev)
npx prisma migrate deploy   # apply committed migrations (prod/CI)
```

### Seeding (demo brand voices)

The repo ships an **idempotent optional seed** (`prisma/seed.ts`) that creates a
legacy demo user and four demo brand voice profiles
(Acme Coffee, Pulse Athletics, Northstar Finance, Roamly) — verbatim, with
their complete voice configurations. It never creates duplicates, so it is
safe to run repeatedly. Authenticated runtime requests never use this demo user.

```bash
npm run db:seed             # or: npx prisma db seed
```

### Fresh production database — full initialization flow

1. Create a managed PostgreSQL instance (e.g. [Neon](https://neon.tech)) and
   copy **both** connection strings from its dashboard:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** (non-pooled) → `DIRECT_URL`
2. Configure both securely in the deployment environment — as Vercel
   environment variables (Project → Settings → Environment Variables) or
   platform secrets. Never commit them to the repository.
   - `DATABASE_URL` (pooled) — used by the deployed application / Prisma
     Client at runtime.
   - `DIRECT_URL` (direct) — used by Prisma for migrations and
     administrative database operations.
3. Initialize the database (uses `DIRECT_URL` for the migration):

   ```bash
   export DATABASE_URL="<pooled url>"     # or use the platform's env
   export DIRECT_URL="<direct url>"
   npx prisma migrate deploy              # create the schema
   ```

4. Verify a Clerk sign-up creates its own Prisma `User`; a new workspace starts
   with no brands, content, or schedules. Run `npm run db:seed` only when legacy
   demo data is intentionally required.
5. Deploy the application (see *Production Deployment* below).

## AI Provider Setup

1. Get an API key from OpenAI (or any compatible gateway) or Anthropic.
2. Set `AI_PROVIDER` and the matching key/model in `.env`.
3. Restart the dev server. Verify under **Settings** — it shows
   `openai · configured ✓` without exposing the key.

Without a key the generate endpoints return a clear, actionable error; the rest
of the app (library, calendar, brands) still works.

## Build & Test Commands

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # serve the production build
npm run test       # Vitest unit tests
npm run lint       # ESLint
```

## GitHub Workflow

The canonical repository is `codera647/ContentForge_AI` and its default
branch is **`master`**.

```bash
git clone https://github.com/codera647/ContentForge_AI.git
cd ContentForge_AI
git checkout master
# …make changes on a feature branch, then open a PR into master…
```

## Production Deployment (Vercel + managed Postgres)

This is a pure full-stack Next.js app — **no separate backend needed**. One
deploy target covers everything.

1. **Database** — create a Postgres instance (e.g. Neon) and copy both the
   **pooled** and **direct** connection strings.
2. **Push to GitHub** (above).
3. **Vercel** → *Add New Project* → import the repo (framework auto-detected).
4. **Environment variables** (Project → Settings → Environment Variables):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon **pooled** URL (used by the app at runtime) |
   | `DIRECT_URL` | Neon **direct** URL (used for migrations) |
   | `AI_PROVIDER` | `openai` (or `anthropic`) |
   | `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | your key |
   | `OPENAI_MODEL` / `ANTHROPIC_MODEL` | optional overrides |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk production publishable key |
   | `CLERK_SECRET_KEY` | Clerk production secret key |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/dashboard` |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/dashboard` |
5. **Deploy.** Then run migrations once against the production DB from your
   machine: `DATABASE_URL="<prod url>" npx prisma migrate deploy`
   (or add it as a Vercel build step / use a release command on Railway).
6. Open your Vercel URL and verify: Settings shows the provider configured,
   create a brand, generate content, schedule it, check the calendar.

**Railway alternative:** create a project from the GitHub repo (Railway detects
Next.js), add a `DATABASE_URL` pointing at a Railway Postgres plugin, set the AI
vars, deploy. Build command `npm run build`, start command `npm run start`.

## Testing Results

- ✅ 54/54 tests pass (`npm run test`), including authentication, cross-user
  IDOR checks, and brand/AI quota boundaries
- ✅ `npm run lint` — clean
- ✅ `prisma validate` and Prisma Client generation — clean
- ✅ `npm run build` — clean Next.js 16.3.5 production build
- ✅ Brand CRUD verified end-to-end; contrasting brand voices produce clearly
  different AI output for the same brief
- ✅ 3-variation generation returns direct / story-driven / educational pieces
  (distinct hooks, structure, CTA) — verified with live model output
- ✅ Repurpose (LinkedIn → Instagram) preserves voice, saves a linked draft;
  same-format repurpose correctly blocked
- ✅ Schedule → appears on the correct calendar day; unschedule reverts to Draft
- ✅ Search / filters / duplicate / delete / copy verified via API
- ✅ Error handling: invalid input (400 + field errors), missing key (actionable
  message), provider failure (502), invalid AI response handling

## Known Limitations

- Scheduling is planning-only; nothing is posted to external networks.
- AI provider failures surface as a generic 502; details are server-logged only.
- Daily AI usage resets at midnight UTC. Accepted operations consume quota even
  if the upstream provider later fails; retries within one operation do not.
- The product has individual workspaces only; team roles and shared workspaces
  are not implemented.
