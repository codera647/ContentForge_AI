# Phase 6 · Scheduling + Calendar

## Goal
Schedule content to a date/time/platform and view it on a monthly calendar.

## Files
- `POST /api/schedule`, `PATCH/DELETE /api/schedule/[id]`
- `app/calendar/page.tsx` — monthly grid (prev/next month navigation), events rendered on the correct day showing time + platform + content title; click event → detail popover (content preview, edit schedule, unschedule, go to content)
- Schedule dialog: date picker, time picker, platform selector (defaults to content format), reusable from workspace results and library

## Acceptance criteria
- [ ] Scheduling content for a date/time makes it appear on that day in the calendar
- [ ] Calendar month navigation works and shows correct months
- [ ] Editing a schedule updates its position; unscheduling removes it and sets content status back to Draft
- [ ] Content status becomes Scheduled when scheduled; multiple items on one day render cleanly
- [ ] Empty calendar shows an empty state with a CTA to create content

## Edge cases
- Scheduling a past date → allowed but flagged visually
- Unscheduling auto-published content handling (status stays Published)
