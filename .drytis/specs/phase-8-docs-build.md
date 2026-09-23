# Phase 8 · Docs, Tests, Production Build

## Goal
Deployment-ready repository.

## Files
- `docs/PRD.md` — documents the ACTUAL implementation: overview, problem, goals, target users, user journeys, functional requirements, AI requirements, brand voice system, generation, calendar, technical architecture, database design, API design, security, performance, acceptance criteria, testing strategy, known limitations, future improvements
- `README.md` — overview, features, tech stack, architecture, folder structure, env vars, installation, DB setup, local dev, AI provider setup, build commands, GitHub workflow, Vercel + managed-Postgres deployment steps (exact)
- `.env.example`
- `prisma/migrations/` committed
- Vitest unit tests (prompt-builder, validation, lib helpers) passing
- `npm run build` succeeds; smoke-test all core flows against the running production build

## Acceptance criteria
- [ ] `npm run build` completes without errors
- [ ] Test suite passes
- [ ] All core flows verified in production build: brand create/edit, generation, brand-voice contrast, variations, save/edit, repurpose, schedule, calendar, error handling
- [ ] README deployment instructions are followable end-to-end with only env vars configured
- [ ] No hardcoded secrets anywhere in the repo
