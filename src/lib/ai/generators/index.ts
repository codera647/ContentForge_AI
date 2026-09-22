import { VARIATION_STRATEGIES } from "@/lib/constants";
import type { VariationStrategy } from "@/lib/constants";
import { getProvider } from "../provider";
import { buildGenerationPrompt, buildRepurposePrompt } from "../prompt-builder";
import { parseAiJson } from "../validation";
import type {
  BrandVoiceInput,
  GeneratedVariation,
  GenerationParams,
  RepurposeRequest,
  VariationRequest,
} from "../types";

const STRATEGY_TEMPERATURES: Record<VariationStrategy, number> = {
  direct: 0.7,
  story_driven: 0.9,
  educational: 0.8,
};

export async function generateVariation(
  brand: BrandVoiceInput | null,
  params: GenerationParams,
  strategy: VariationStrategy
): Promise<GeneratedVariation> {
  const provider = getProvider();
  const prompt = buildGenerationPrompt({ brand, params, strategy });
  const raw = await provider.generate({
    messages: [
      { role: "system", content: "You are an expert brand copywriter. Respond ONLY with valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: STRATEGY_TEMPERATURES[strategy],
    maxTokens: params.format === "blog" || params.length === "long" ? 3000 : 1500,
  });
  const parsed = parseAiJson(raw);
  return { ...parsed, strategy };
}

export async function generateVariations(
  brand: BrandVoiceInput | null,
  params: GenerationParams & { variations: number }
): Promise<GeneratedVariation[]> {
  const { variations: count, ...base } = params;
  void count;
  // Assign distinct strategies so variations are structurally different,
  // not paraphrases.
  const strategies: VariationStrategy[] =
    params.variations >= 3
      ? ["direct", "story_driven", "educational"]
      : params.variations === 2
        ? ["direct", "story_driven"]
        : [VARIATION_STRATEGIES[Math.floor(Math.random() * 3)]];

  return Promise.all(
    strategies.map((s, i) =>
      generateVariation(brand, base, s).catch((e) =>
        Promise.reject(Object.assign(e, { variationIndex: i }))
      )
    )
  );
}

export async function repurposeContent(req: RepurposeRequest): Promise<GeneratedVariation> {
  const provider = getProvider();
  const prompt = buildRepurposePrompt(req);
  const raw = await provider.generate({
    messages: [
      { role: "system", content: "You are an expert brand copywriter. Respond ONLY with valid JSON." },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    maxTokens: 8000,
  });
  return parseAiJson(raw);
}

