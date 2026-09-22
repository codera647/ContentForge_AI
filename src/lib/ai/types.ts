import type { VariationStrategy } from "@/lib/constants";

export type { ContentTypeValue } from "@/lib/constants";

export type AiProviderName = "openai" | "anthropic" | "mock";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface GenerateOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AiProvider {
  readonly name: AiProviderName;
  generate(opts: GenerateOptions): Promise<string>;
}

export interface BrandVoiceInput {
  name: string;
  description?: string | null;
  industry?: string | null;
  targetAudience?: string | null;
  personality?: string | null;
  tone?: string | null;
  values?: string[] | null;
  preferredPhrases?: string[] | null;
  avoidedPhrases?: string[] | null;
  writingStyle?: string | null;
  exampleContent?: string | null;
}

export interface GenerationParams {
  format: string;
  topic: string;
  audience?: string;
  objective?: string;
  tone?: string;
  length?: "short" | "medium" | "long";
  keywords?: string[];
  cta?: string;
}

export interface VariationRequest {
  brand: BrandVoiceInput | null;
  params: GenerationParams;
  strategy: VariationStrategy;
}

export interface RepurposeRequest {
  brand: BrandVoiceInput | null;
  sourceBody: string;
  sourceFormat: string;
  targetFormat: string;
  topic?: string | null;
}

export interface GeneratedVariation {
  title: string;
  body: string;
  strategy: VariationStrategy;
}
