# Phase 2 · AI Layer

## Goal
A reusable, provider-switchable AI layer — no AI logic in UI components.

## Files
```
lib/ai/
  provider.ts      // OpenAIProvider, AnthropicProvider implementing AiProvider.generate(messages, opts); factory selects via AI_PROVIDER env
  prompt-builder.ts// buildGenerationPrompt(brand, params, strategy), buildRepurposePrompt(...)
  generators/      // one module per format + shared generateContent(), generateVariations(), repurposeContent()
  validation.ts    // zod schemas for request params & AI output; retry-on-invalid once
  types.ts         // ContentType, Tone, Length, BrandVoiceParams, GenerationRequest/Response
```
API routes (App Router, server-only):
- `POST /api/generate` — brandId + params + variationCount(1–3) + strategies → array of variations
- `POST /api/repurpose` — contentId + targetFormat → regenerated content preserving brand voice

## Prompt structure
Role → Brand Context (all brand fields, preferred/avoided phrases) → Content Task (format, topic, audience, objective, tone, length, keywords, CTA) → Constraints. Variation strategies: `direct`, `story-driven`, `educational` — different hooks, structure, wording, CTA.

## Error handling
- Missing API key → 400 with actionable message ("Set OPENAI_API_KEY").
- Provider failure → 502 with generic message; log detail server-side.
- Invalid/unparseable AI response → one retry, then 502.
- Invalid input → 400 with field errors from zod.

## Acceptance criteria
- [ ] `POST /api/generate` returns 1–3 genuinely different variations for a valid request
- [ ] Missing/invalid inputs return 400 with field-level errors
- [ ] No API key returns a clear 400; key never reaches the client
- [ ] Two different brands with the same request produce noticeably different output tone

## Tests
- Unit tests for prompt-builder and validation (vitest); provider mocked in route tests.
