import type {
  BrandVoiceInput,
  GenerationParams,
  RepurposeRequest,
  VariationRequest,
} from "./types";
import { LENGTH_GUIDANCE, LENGTHS, STRATEGY_DESCRIPTIONS, CONTENT_TYPE_LABELS } from "@/lib/constants";

const FORMAT_NOTES: Record<string, string> = {
  linkedin:
    "A LinkedIn post: strong first line hook (before the fold), short paragraphs, line breaks for scannability, optional 3-5 hashtags at the end, max ~1300 characters.",
  x: "A single X/Twitter post: max 280 characters, punchy, no hashtags unless essential, one clear idea.",
  instagram:
    "An Instagram caption: scroll-stopping first line, emoji used tastefully, short paragraphs, 5-10 relevant hashtags at the end.",
  facebook:
    "A Facebook post: conversational, community-focused, moderate length (under ~500 characters ideal), may include one question to drive comments.",
  email:
    "A marketing email: subject line on the first line prefixed 'Subject:', then a preview sentence, greeting, short scannable body with one clear CTA and a sign-off.",
  ad_copy:
    "Ad copy: a headline (max 40 chars), 2-3 primary text variants of one to two sentences, and a CTA button label.",
  product_description:
    "A product description: benefit-led opening, 3-5 feature bullets, sensory/adjective-rich but honest language, closing CTA.",
  blog: "A blog post: an SEO-friendly title (H1), a short intro hook, 3-5 sections with H2 headings, a conclusion with CTA. Use markdown.",
};

export function formatLabel(format: string): string {
  return CONTENT_TYPE_LABELS[format] ?? format;
}

export function buildBrandContext(brand: BrandVoiceInput | null): string {
  if (!brand) {
    return (
      "## Brand Context\n" +
      "No brand profile was selected. Write in a clear, versatile, professional-but-friendly voice."
    );
  }
  const lines = [
    `## Brand Context (voice: ${brand.name})`,
    brand.description && `Description: ${brand.description}`,
    brand.industry && `Industry: ${brand.industry}`,
    brand.targetAudience && `Target audience: ${brand.targetAudience}`,
    brand.personality && `Personality: ${brand.personality}`,
    brand.tone && `Tone: ${brand.tone}`,
    brand.values?.length && `Brand values: ${brand.values.join(", ")}`,
    brand.writingStyle && `Writing style: ${brand.writingStyle}`,
    brand.preferredPhrases?.length &&
      `Naturally weave in these preferred phrases where they fit: ${brand.preferredPhrases
        .map((p) => `"${p}"`)
        .join(", ")}`,
    brand.avoidedPhrases?.length &&
      `NEVER use these words/phrases: ${brand.avoidedPhrases.map((p) => `"${p}"`).join(", ")}`,
    brand.exampleContent &&
      `Example of the brand's writing (match its rhythm and diction, do not copy its content):\n"""\n${brand.exampleContent.slice(0, 1200)}\n"""`,
  ].filter(Boolean);
  return "## Brand Context\n" + lines.join("\n");
}

function buildConstraints(params: GenerationParams, strategy: string): string {
  const length = LENGTH_GUIDANCE[params.length ?? "medium"];
  const lines = [
    "## Constraints",
    `- Length: ${length} (adapt sensibly to the format).`,
    params.keywords?.length
      ? `- Include these keywords naturally: ${params.keywords.join(", ")}.`
      : "- No specific keywords required.",
    params.cta ? `- End with this call to action: "${params.cta}".` : "- End with a clear call to action.",
    `- Strategy: ${strategy}. ${strategy === "story_driven" ? "" : ""}`,
    "- Output ONLY valid JSON matching the requested schema. No commentary, no markdown fences.",
  ];
  return lines.join("\n");
}

const SYSTEM_ROLE = `You are an elite senior copywriter and content strategist. You write marketing content that is on-brand, specific, and genuinely engaging — never generic filler. You always follow brand voice instructions exactly, and you always return output in the exact JSON schema requested.`;

const OUTPUT_SCHEMA = `Return ONLY a JSON object with exactly these keys:
{"title": "<short internal title for this piece>", "body": "<the full content text>"}$
The "body" value must contain the complete content, with newlines where appropriate.`;

export function buildGenerationPrompt(req: VariationRequest): string {
  const { brand, params, strategy } = req;
  const strategyDesc = STRATEGY_DESCRIPTIONS[strategy];
  const sections = [
    "# Role",
    SYSTEM_ROLE,
    "",
    buildBrandContext(brand),
    "",
    "## Content Task",
    `- Format: ${formatLabel(params.format)} — ${FORMAT_NOTES[params.format] ?? "well-structured social/marketing content"}`,
    `- Topic: ${params.topic}`,
    params.audience && `- Audience: ${params.audience}`,
    params.objective && `- Objective: ${params.objective}`,
    params.tone && `- Tone for this piece: ${params.tone}`,
    "",
    "## Approach",
    strategyDesc
      ? `Write this variation using a ${strategy.replace("_", "-")} approach: ${strategyDesc}`
      : "",
    "",
    buildConstraints(params, strategy),
    "",
    "## Output Schema",
    OUTPUT_SCHEMA,
  ];
  return sections.filter((s) => s !== "").join("\n");
}

export function buildRepurposePrompt(req: RepurposeRequest): string {
  const sections = [
    "# Role",
    SYSTEM_ROLE,
    "",
    buildBrandContext(req.brand),
    "",
    "## Content Task: Repurpose",
    `Repurpose the SOURCE CONTENT below from its original format (${formatLabel(
      req.sourceFormat
    )}) into a new ${formatLabel(req.targetFormat)} piece.`,
    `— ${FORMAT_NOTES[req.targetFormat] ?? "well-structured marketing content"}`,
    req.topic ? `Topic context: ${req.topic}` : "",
    "",
    "## Constraints",
    "- Preserve the core message, key facts, and the brand voice.",
    "- Fully restructure for the new format: new hook, new rhythm, appropriate length — NOT a trimmed copy-paste.",
    "- End with a clear call to action.",
    "",
    "## Source Content",
    `Format: ${formatLabel(req.sourceFormat)}`,
    '"""',
    req.sourceBody.slice(0, 6000),
    '"""',
    "",
    "## Output Schema",
    OUTPUT_SCHEMA,
  ];
  return sections.filter((s) => s !== "").join("\n");
}

// re-export for unit tests
export { LENGTHS };
