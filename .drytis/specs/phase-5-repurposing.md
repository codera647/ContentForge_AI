# Phase 5 · Repurposing

## Goal
Convert saved content between formats while preserving brand voice.

## Files
- `POST /api/repurpose` (from Phase 2) wired to UI: repurpose action in Library and content editor opens a dialog (target format + optional tweaks)
- Creates a NEW content record in Draft linked by `sourceContentId` field on Content
- `app/content/[id]/page.tsx` or dialog showing original vs repurposed side by side

## Acceptance criteria
- [ ] Repurposing a blog post to LinkedIn / Instagram / Email / Ad copy each produces format-appropriate output
- [ ] Output reflects the original content's brand voice
- [ ] Repurposed item is saved as a new Draft in the Library, referencing its source
- [ ] Repurposing with no linked brand still works (generic voice) with a notice

## Edge cases
- Repurposing to the same format → blocked with a message
- Provider error during repurpose → dialog error state, original untouched
