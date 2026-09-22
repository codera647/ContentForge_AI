export const CONTENT_TYPES = [
  { value: "linkedin", label: "LinkedIn Post", icon: "in" },
  { value: "x", label: "X / Twitter Post", icon: "X" },
  { value: "instagram", label: "Instagram Caption", icon: "ig" },
  { value: "facebook", label: "Facebook Post", icon: "f" },
  { value: "email", label: "Marketing Email", icon: "@" },
  { value: "ad_copy", label: "Ad Copy", icon: "ad" },
  { value: "product_description", label: "Product Description", icon: "pd" },
  { value: "blog", label: "Blog Post", icon: "blog" },
] as const;

export type ContentTypeValue = (typeof CONTENT_TYPES)[number]["value"];

export const CONTENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONTENT_TYPES.map((t) => [t.value, t.label])
);

export const TONES = [
  "professional",
  "casual",
  "playful",
  "authoritative",
  "inspirational",
  "empathetic",
  "witty",
  "urgent",
] as const;

export const LENGTHS = ["short", "medium", "long"] as const;

export const LENGTH_GUIDANCE: Record<(typeof LENGTHS)[number], string> = {
  short: "roughly 50-100 words",
  medium: "roughly 150-300 words",
  long: "roughly 500-900 words",
};

export const VARIATION_STRATEGIES = ["direct", "story_driven", "educational"] as const;
export type VariationStrategy = (typeof VARIATION_STRATEGIES)[number];

export const STRATEGY_LABELS: Record<VariationStrategy, string> = {
  direct: "Direct",
  story_driven: "Story-driven",
  educational: "Educational",
};

export const STRATEGY_DESCRIPTIONS: Record<VariationStrategy, string> = {
  direct: "Leads with the value proposition and a clear, punchy CTA.",
  story_driven: "Opens with a relatable anecdote or scenario, then lands the message.",
  educational: "Teaches the reader something useful first, then connects it to the offer.",
};

export const CONTENT_STATUSES = ["draft", "scheduled", "published", "archived"] as const;

export const OBJECTIVES = [
  "awareness",
  "engagement",
  "leads",
  "sales",
  "education",
  "announcement",
] as const;
