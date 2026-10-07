import { z } from "zod";
import { CONTENT_TYPES, CONTENT_STATUSES, type ContentTypeValue } from "@/lib/constants";
import type { GeneratedVariation } from "./types";

export const formatValues = CONTENT_TYPES.map((t) => t.value) as [ContentTypeValue, ...ContentTypeValue[]];

export const generationParamsSchema = z.object({
  brandId: z.string().min(1).nullable().optional(),
  format: z.enum(formatValues),
  topic: z.string().trim().min(3, "Topic must be at least 3 characters").max(500),
  audience: z.string().trim().max(300).optional(),
  objective: z.string().trim().max(300).optional(),
  tone: z.string().trim().max(100).optional(),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  keywords: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  cta: z.string().trim().max(300).optional(),
  variations: z.number().int().min(1).max(3).default(1),
});

export type GenerationParamsInput = z.infer<typeof generationParamsSchema>;

export const generateRequestSchema = z.object({
  save: z.boolean().default(false),
  params: generationParamsSchema,
});

export const repurposeRequestSchema = z.object({
  contentId: z.string().min(1),
  targetFormat: z.enum(formatValues),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Brand name is required").max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  industry: z.string().trim().max(200).optional().nullable(),
  targetAudience: z.string().trim().max(500).optional().nullable(),
  personality: z.string().trim().max(500).optional().nullable(),
  tone: z.string().trim().max(200).optional().nullable(),
  values: z.array(z.string().trim().min(1).max(120)).max(20).optional().nullable(),
  preferredPhrases: z.array(z.string().trim().min(1).max(120)).max(30).optional().nullable(),
  avoidedPhrases: z.array(z.string().trim().min(1).max(120)).max(30).optional().nullable(),
  writingStyle: z.string().trim().max(1000).optional().nullable(),
  exampleContent: z.string().trim().max(5000).optional().nullable(),
});

export const contentUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  body: z.string().min(1).optional(),
  status: z.enum(["draft", "scheduled", "published", "archived"]).optional(),
  format: z.enum(formatValues).optional(),
});

export const scheduleSchema = z.object({
  contentId: z.string().min(1),
  platform: z.enum(formatValues),
  scheduledAt: z.string().datetime({ offset: true }),
});

export const scheduleUpdateSchema = scheduleSchema.omit({ contentId: true }).partial()
  .refine((value) => value.platform !== undefined || value.scheduledAt !== undefined, "Choose a date/time or platform to update");

export const contentListSchema = z.object({
  q: z.string().trim().max(500).optional(),
  format: z.enum(formatValues).optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  brandId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Parse the AI's text output into a {title, body} object.
 * Tolerates markdown fences and stray prose around the JSON.
 * Throws Error("invalid_ai_response") if nothing parseable is found.
 */
export function parseAiJson(raw: string): GeneratedVariation {
  let text = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fence) text = fence[1].trim();

  // Fast path
  try {
    return validateAiObject(JSON.parse(text));
  } catch {
    /* fall through to brute-force scan */
  }

  // Scan for the first balanced JSON object containing "body"
  let start = text.indexOf("{");
  while (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < text.length; i++) {
      if (inString) {
        if (escaped) escaped = false;
        else if (text[i] === "\\") escaped = true;
        else if (text[i] === '"') inString = false;
        continue;
      }
      if (text[i] === '"') { inString = true; continue; }
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          try {
            return validateAiObject(JSON.parse(text.slice(start, i + 1)));
          } catch {
            break;
          }
        }
      }
    }
    const next = text.indexOf("{", start + 1);
    if (next === -1) break;
    start = next;
  }
  throw new Error("invalid_ai_response");
}

function validateAiObject(obj: unknown): GeneratedVariation {
  const parsed = z
    .object({
      title: z.string().min(1).catch("Untitled"),
      body: z.string().min(1),
    })
    .safeParse(obj);
  if (!parsed.success) throw new Error("invalid_ai_response");
  return parsed.data as GeneratedVariation;
}
