# Phase 3 · Brand Voice

## Goal
CRUD for brand profiles; all fields feed the AI prompt.

## Files
- `POST/PATCH/DELETE /api/brands`, `GET /api/brands`, `GET /api/brands/[id]`
- `app/brands/page.tsx` (list), `app/brands/new/page.tsx`, `app/brands/[id]/edit/page.tsx`
- Reusable `BrandForm` component with all 11 fields (name, description, industry, target audience, personality, tone, values, preferred phrases, phrases to avoid, writing style, example content); list-type fields as tag/chip inputs.

## Acceptance criteria
- [ ] User can create a brand with all fields and see it in the list
- [ ] User can edit any field and the change persists after reload
- [ ] User can delete a brand (confirm dialog); its content remains but is unlinked or handled gracefully
- [ ] Empty state on Brand Voice page before any brand exists
- [ ] Generating content with two contrasting brands (e.g. playful DTC vs formal fintech) yields clearly different writing styles

## Edge cases
- Required fields missing → inline validation errors
- Duplicate brand names allowed
