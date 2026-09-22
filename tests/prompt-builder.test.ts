import { describe, it, expect } from "vitest";
import { buildBrandContext, buildGenerationPrompt, buildRepurposePrompt } from "@/lib/ai/prompt-builder";
import type { BrandVoiceInput, GenerationParams, VariationRequest, RepurposeRequest } from "@/lib/ai/types";

const brand: BrandVoiceInput = {
  name: "Acme Coffee",
  description: "Small-batch roastery",
  industry: "Specialty coffee",
  targetAudience: "Home baristas 25-40",
  personality: "Warm, nerdy, cheeky",
  tone: "casual",
  values: ["sustainability", "craft"],
  preferredPhrases: ["brewed with intention"],
  avoidedPhrases: ["game-changer", "synergy"],
  writingStyle: "Short sentences, active voice",
  exampleContent: "Life's too short for stale beans.",
};

const params: GenerationParams = {
  format: "linkedin",
  topic: "New espresso blend launch",
  audience: "Home baristas",
  objective: "sales",
  tone: "casual",
  length: "medium",
  keywords: ["espresso", "single origin"],
  cta: "Shop the launch roast",
};

describe("buildBrandContext", () => {
  it("includes every brand field when provided", () => {
    const ctx = buildBrandContext(brand);
    for (const s of ["Acme Coffee", "Specialty coffee", "sustainability", "brewed with intention", "game-changer", "stale beans"]) {
      expect(ctx).toContain(s);
    }
  });

  it("marks avoided phrases as forbidden", () => {
    const ctx = buildBrandContext(brand);
    expect(ctx).toMatch(/NEVER use/i);
  });

  it("falls back to a generic voice with no brand", () => {
    const ctx = buildBrandContext(null);
    expect(ctx).toContain("No brand profile");
  });
});

describe("buildGenerationPrompt", () => {
  it("contains the four prompt sections in order", () => {
    const req: VariationRequest = { brand, params, strategy: "direct" };
    const p = buildGenerationPrompt(req);
    const role = p.indexOf("# Role");
    const brandCtx = p.indexOf("## Brand Context");
    const task = p.indexOf("## Content Task");
    const constraints = p.indexOf("## Constraints");
    expect(role).toBeGreaterThanOrEqual(0);
    expect(brandCtx).toBeGreaterThan(role);
    expect(task).toBeGreaterThan(brandCtx);
    expect(constraints).toBeGreaterThan(task);
  });

  it("embeds topic, keywords, CTA and the requested strategy", () => {
    const p = buildGenerationPrompt({ brand, params, strategy: "story_driven" });
    expect(p).toContain("New espresso blend launch");
    expect(p).toContain("espresso, single origin");
    expect(p).toContain("Shop the launch roast");
    expect(p).toContain("story-driven");
  });

  it("reflects requested length", () => {
    const p = buildGenerationPrompt({ brand, params: { ...params, length: "long" }, strategy: "educational" });
    expect(p).toMatch(/500-900 words/);
  });

  it("different strategies produce different prompts", () => {
    const a = buildGenerationPrompt({ brand, params, strategy: "direct" });
    const b = buildGenerationPrompt({ brand, params, strategy: "educational" });
    expect(a).not.toEqual(b);
  });

  it("uses format-specific notes", () => {
    const x = buildGenerationPrompt({ brand, params: { ...params, format: "x" }, strategy: "direct" });
    expect(x).toMatch(/280 characters/);
  });
});

describe("buildRepurposePrompt", () => {
  it("includes source content and target format", () => {
    const req: RepurposeRequest = {
      brand,
      sourceBody: "Long blog post text...",
      sourceFormat: "blog",
      targetFormat: "instagram",
      topic: "espresso",
    };
    const p = buildRepurposePrompt(req);
    expect(p).toContain("Long blog post text...");
    expect(p).toContain("Instagram");
    expect(p).toContain("Repurpose");
  });
});
