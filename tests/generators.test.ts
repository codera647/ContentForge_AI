import { describe, it, expect } from "vitest";
import { MockProvider } from "@/lib/ai/provider";
import { generateVariations, repurposeContent } from "@/lib/ai/generators";
import type { GenerationParams } from "@/lib/ai/types";

// generators use getProvider() which respects AI_PROVIDER; force mock for tests
process.env.AI_PROVIDER = "mock";

const params: GenerationParams = {
  format: "linkedin",
  topic: "Espresso blend launch",
  length: "short",
  keywords: ["espresso"],
  cta: "Shop now",
};

describe("MockProvider", () => {
  it("returns valid JSON with title and body", async () => {
    const raw = await new MockProvider().generate({
      messages: [{ role: "user", content: "Format: LinkedIn Post\nTopic: test\n" }],
    });
    const obj = JSON.parse(raw);
    expect(typeof obj.title).toBe("string");
    expect(typeof obj.body).toBe("string");
  });
});

describe("generateVariations (mock)", () => {
  it("returns the requested number of variations", async () => {
    for (const n of [1, 2, 3]) {
      const vs = await generateVariations(null, { ...params, variations: n });
      expect(vs).toHaveLength(n);
    }
  });

  it("assigns distinct strategies for multi-variation requests", async () => {
    const vs = await generateVariations(null, { ...params, variations: 3 });
    const strategies = new Set(vs.map((v) => v.strategy));
    expect(strategies.size).toBe(3);
  });

  it("weaves brand voice into mock output", async () => {
    const [v] = await generateVariations(
      { name: "Nordic Fintech", tone: "authoritative" },
      { ...params, variations: 1 }
    );
    expect(v.body).toContain("Nordic Fintech");
  });
});

describe("repurposeContent (mock)", () => {
  it("produces a new piece referencing the source", async () => {
    const v = await repurposeContent({
      brand: { name: "Acme" },
      sourceBody: "Original blog content about coffee.",
      sourceFormat: "blog",
      targetFormat: "email",
    });
    expect(v.body.length).toBeGreaterThan(0);
    expect(v.title.length).toBeGreaterThan(0);
  });
});
