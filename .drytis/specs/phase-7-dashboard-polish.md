# Phase 7 · Dashboard + Polish

## Goal
Landing dashboard with real stats and a final quality pass.

## Files
- `GET /api/stats` — total content, drafts, scheduled, active brands
- `app/page.tsx` — stat cards, recent content list (5), upcoming scheduled (5), quick actions: Create Content / Add Brand / Schedule Content
- Global polish: consistent loading skeletons, toasts for success/error, responsive audit (mobile drawer nav, tables → cards), settings page stub (AI provider status, app info)

## Acceptance criteria
- [ ] Dashboard shows correct live counts after generating/saving/scheduling
- [ ] Recent content and upcoming scheduled lists are accurate and clickable
- [ ] All three quick actions navigate to working flows
- [ ] App is usable at 375px width (no horizontal scroll, drawer nav works)
- [ ] Settings page shows AI provider status without leaking the key

## Edge cases
- Brand-new account: dashboard empty states for every section
