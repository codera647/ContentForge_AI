# Phase 4 · Generation Workspace + Content Library

## Goal
The core workspace and the persisted library.

## Files
- `app/create/page.tsx` — workspace form (brand, format dropdown of 8 types, topic, audience, objective, tone, length, keywords, CTA, variations 1–3)
- Results panel per variation: edit-in-place, copy-to-clipboard, save, regenerate, schedule shortcut
- `POST /api/content`, `GET /api/content` (search q, filters: format, status, brand; pagination), `PATCH/DELETE /api/content/[id]`
- `app/library/page.tsx` — table/cards with search, filters, actions: edit, copy, delete, duplicate, repurpose (→ Phase 5), schedule (→ Phase 6), status badges (Draft/Scheduled/Published/Archived)

## Acceptance criteria
- [ ] Selecting a brand + topic + format and clicking Generate shows loading state then 1–3 variations
- [ ] Variations differ in hook, structure and CTA, not just paraphrase
- [ ] Saved content appears in Library with correct status/format/brand
- [ ] Search and each filter return correct results
- [ ] Edit persists; delete removes; duplicate creates an independent copy in Draft
- [ ] Copy button copies full text to clipboard
- [ ] Empty, loading, success and error states all present in both workspace and library
- [ ] Regenerate replaces a variation with fresh output

## Edge cases
- Generation failure (bad key / provider down) → visible error banner, form inputs preserved
- Very long blog output → truncation-safe rendering, scrollable editor
