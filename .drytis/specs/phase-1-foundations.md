# Phase 1 · Foundations

## Goal
Scaffold the app and data model so every later phase builds on a working skeleton.

## Files / tasks
- Scaffold Next.js (App Router) + TypeScript + Tailwind in `/workspace` (project root = repo root).
- Install and configure Prisma + PostgreSQL (`prisma/schema.prisma`).
- Prisma models:
  - **User** (id, name, email, createdAt)
  - **Brand** (id, userId→User, name, description, industry, targetAudience, personality, tone, values[], preferredPhrases[], avoidedPhrases[], writingStyle, exampleContent, timestamps)
  - **Content** (id, userId, brandId?, title, body, format enum[linkedin,x,instagram,facebook,email,ad_copy,product_description,blog], topic, audience, objective, tone, keywords[], cta, status enum[draft,scheduled,published,archived], timestamps)
  - **ScheduledContent** (id, contentId→Content, platform, scheduledAt datetime, status enum[pending,published,cancelled], timestamps)
- App shell: sidebar navigation (Dashboard, Create Content, Content Library, Calendar, Brand Voice, Settings), responsive with mobile drawer.
- `.env.example` with DATABASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY, AI_PROVIDER, OPENAI_MODEL, ANTHROPIC_MODEL.
- Wire DB env to the container's auto-provisioned database.

## Acceptance criteria (running app)
- [ ] App loads in a browser with the sidebar and Dashboard route (placeholder page)
- [ ] `prisma migrate dev` runs successfully; tables exist
- [ ] App still loads if the database is briefly unreachable (graceful error, not a crash page)

## Edge cases
- Missing DATABASE_URL → clear error message at startup, not a stack trace.
