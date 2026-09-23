# Stage 2 — Multi-user database ownership + authorization

## Goal
Every authenticated Clerk user owns isolated Brands/Content/Schedules/stats; all enforcement server-side.

## Files to change
- prisma/schema.prisma: User.clerkUserId (@unique), imageUrl; new AiUsage model (id, userId, day (DateTime @db.Date), count, @@unique([userId, day]))
- prisma/migrations/<ts>_multi_user_ownership: additive only (nullable-not-needed; existing rows get non-null userId already; new columns nullable/defaulted)
- src/lib/auth.ts (new): requireCurrentUser() — auth() → clerkUserId → upsert User (clerkUserId unique) → return app user; getCurrentUserOrNull()
- src/lib/limits.ts (new): BRAND_LIMIT=3, AI_DAILY_LIMIT=50, consumeAiOperation(userId) (upsert + atomic increment, race-safe), checkAiQuota
- All 9 API routes: replace getDefaultUserId() with requireCurrentUser(); 401 when unauthenticated; ownership via existing findFirst({id, userId}) pattern (already present everywhere — security relied on default user, now per-user); brand create enforces limit (403 w/ clear message, grandfathered accounts over 3 blocked only from creating); generate + repurpose consume 1 operation BEFORE provider call; 429 on quota
- src/app/(app)/dashboard/page.tsx: onboarding/empty state (0 brands → "Create your first brand")
- src/app/(app)/brands/*, create page: empty states, limit error surfaced; Create page guides to brand creation when none
- prisma/seed.ts: keep default user + 4 demo brands (dev association handled separately)

## Acceptance criteria
- [ ] Unauthenticated API → 401 on brands/content/generate/repurpose/schedule/stats
- [ ] requireCurrentUser creates+synchronizes Clerk-linked user server-side
- [ ] All CRUD ownership checks server-side (IDOR-safe)
- [ ] Brand limit 3 server-enforced; >3 accounts grandfathered (create blocked, data intact)
- [ ] AI limit 50/day server-enforced; 3-variation generation = 1 op; retries don't count; repurpose = 1 op
- [ ] New Clerk user → zero brands/content/schedules; polished empty states
- [ ] Dashboard stats scoped to current user; "Failed to load dashboard stats" gone for authed owner
- [ ] Migration additive, inspected SQL, no destructive ops; production Neon untouched
- [ ] IDOR test suite: 2 users × brand/content/schedule/generate vectors — all denied
- [ ] npm test/lint/build/type-check: no new issues vs baseline
- [ ] Diff secret scan clean

## Notes
- Dashboard 500 root cause found: container .env materialized empty after restart (DATABASE_URL missing → PrismaClientInitializationError). Infra issue, not code. Fixed by container restart; must re-verify after deploys.
- Demo brand→Clerk-user association in dev DB happens via the real authenticated session, never guessed.
