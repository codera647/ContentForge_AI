import { describe, it, expect } from "vitest";
import {
  generationParamsSchema,
  generateRequestSchema,
  brandSchema,
  scheduleSchema,
  repurposeRequestSchema,
  parseAiJson,
} from "@/lib/ai/validation";

describe("generationParamsSchema", () => {
  const valid = {
    format: "linkedin",
    topic: "Launch post",
    length: "medium",
    keywords: [],
    variations: 2,
  };

  it("accepts a valid request", () => {
    expect(generationParamsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid format", () => {
    expect(generationParamsSchema.safeParse({ ...valid, format: "tiktok" }).success).toBe(false);
  });

  it("rejects a short topic", () => {
    expect(generationParamsSchema.safeParse({ ...valid, topic: "ab" }).success).toBe(false);
  });

  it("rejects variations out of 1-3", () => {
    expect(generationParamsSchema.safeParse({ ...valid, variations: 4 }).success).toBe(false);
    expect(generationParamsSchema.safeParse({ ...valid, variations: 0 }).success).toBe(false);
  });

  it("rejects more than 10 keywords", () => {
    expect(
      generationParamsSchema.safeParse({ ...valid, keywords: Array.from({ length: 11 }, (_, i) => `k${i}`) }).success
    ).toBe(false);
  });

  it("generateRequestSchema defaults save to false", () => {
    const r = generateRequestSchema.parse({ params: valid });
    expect(r.save).toBe(false);
  });
});

describe("brandSchema", () => {
  it("requires a name", () => {
    expect(brandSchema.safeParse({ name: "" }).success).toBe(false);
    expect(brandSchema.safeParse({ name: "Acme" }).success).toBe(true);
  });

  it("accepts list fields", () => {
    expect(brandSchema.safeParse({ name: "Acme", values: ["craft"], avoidedPhrases: ["synergy"] }).success).toBe(true);
  });
});

describe("scheduleSchema", () => {
  it("accepts ISO datetime", () => {
    expect(scheduleSchema.safeParse({ contentId: "c1", platform: "x", scheduledAt: new Date().toISOString() }).success).toBe(true);
  });
  it("rejects missing fields", () => {
    expect(scheduleSchema.safeParse({ contentId: "c1" }).success).toBe(false);
  });
});

describe("repurposeRequestSchema", () => {
  it("rejects same-format targets only via API logic — schema accepts any valid format", () => {
    expect(repurposeRequestSchema.safeParse({ contentId: "c1", targetFormat: "blog" }).success).toBe(true);
  });
});

describe("parseAiJson", () => {
  it("parses clean JSON", () => {
    expect(parseAiJson('{"title":"T","body":"B"}')).toEqual({ title: "T", body: "B" });
  });

  it("parses JSON inside markdown fences", () => {
    expect(parseAiJson('```json\n{"title":"T","body":"B"}\n```')).toEqual({ title: "T", body: "B" });
  });

  it("parses JSON embedded in prose", () => {
    expect(parseAiJson('Sure! Here you go: {"title":"T","body":"B"} hope that helps')).toEqual({
      title: "T",
      body: "B",
    });
  });

  it("parses bodies containing newlines and braces", () => {
    const body = "Line one {weird}\nLine two";
    expect(parseAiJson(JSON.stringify({ title: "T", body }))).toEqual({ title: "T", body });
  });

  it("defaults a missing title", () => {
    expect(parseAiJson('{"body":"B"}').title).toBe("Untitled");
  });

  it("throws invalid_ai_response on garbage", () => {
    expect(() => parseAiJson("no json here at all")).toThrow("invalid_ai_response");
    expect(() => parseAiJson('{"wrong":1}')).toThrow("invalid_ai_response");
  });
});
