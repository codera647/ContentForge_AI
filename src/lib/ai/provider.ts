import type { AiProvider, AiProviderName, ChatMessage, GenerateOptions } from "./types";

export class MissingApiKeyError extends Error {
  constructor(public provider: AiProviderName) {
    super(
      provider === "openai"
        ? "OPENAI_API_KEY is not set. Add it to your environment (.env) to use the OpenAI provider."
        : "ANTHROPIC_API_KEY is not set. Add it to your environment (.env) to use the Anthropic provider."
    );
    this.name = "MissingApiKeyError";
  }
}

export class AiProviderError extends Error {
  constructor(message: string, public provider: AiProviderName, public status?: number) {
    super(message);
    this.name = "AiProviderError";
  }
}

const DEFAULT_BASES = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
} as const;

class OpenAiProvider implements AiProvider {
  readonly name = "openai" as const;
  private key: string;
  private base: string;
  private model: string;

  constructor(key: string, model: string) {
    this.key = key;
    this.base = process.env.OPENAI_BASE_URL || DEFAULT_BASES.openai;
    this.model = model;
  }

  async generate(opts: GenerateOptions): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.key}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.8,
          max_tokens: opts.maxTokens ?? 2000,
        }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (e) {
      throw new AiProviderError(
        `OpenAI request failed: ${e instanceof Error ? e.message : "network error"}`,
        this.name
      );
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new AiProviderError(
        `OpenAI API error ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
        this.name,
        res.status
      );
    }
    const data = (await res.json()) as {
      choices?: {
        message?: { content?: string | null; reasoning_content?: string | null };
        finish_reason?: string;
      }[];
    };
    const choice = data.choices?.[0];
    let text = choice?.message?.content ?? "";

    // Reasoning models (e.g. glm) may spend the entire max_tokens budget on
    // hidden reasoning_content and return empty content when finish_reason is
    // "length". Retry once with a much larger budget before giving up.
    if (!text.trim() && choice?.finish_reason === "length" && (opts.maxTokens ?? 0) < 16000) {
      return this.generate({ ...opts, maxTokens: 16000 });
    }
    if (!text.trim()) throw new AiProviderError("OpenAI returned an empty response", this.name);
    return text;
  }
}

class AnthropicProvider implements AiProvider {
  readonly name = "anthropic" as const;
  private key: string;
  private base: string;
  private model: string;

  constructor(key: string, model: string) {
    this.key = key;
    this.base = process.env.ANTHROPIC_BASE_URL || DEFAULT_BASES.anthropic;
    this.model = model;
  }

  async generate(opts: GenerateOptions): Promise<string> {
    const system = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const user = opts.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n\n");
    let res: Response;
    try {
      res = await fetch(`${this.base}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          system,
          max_tokens: opts.maxTokens ?? 2000,
          temperature: opts.temperature ?? 0.8,
          messages: [{ role: "user", content: user }],
        }),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (e) {
      throw new AiProviderError(
        `Anthropic request failed: ${e instanceof Error ? e.message : "network error"}`,
        this.name
      );
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new AiProviderError(
        `Anthropic API error ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
        this.name,
        res.status
      );
    }
    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.map((c) => c.text ?? "").join("");
    if (!text) throw new AiProviderError("Anthropic returned an empty response", this.name);
    return text;
  }
}

export function getProvider(): AiProvider {
  const requested = (process.env.AI_PROVIDER || "").toLowerCase() as AiProviderName | "";

  if (requested === "mock") return new MockProvider();

  if (requested === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new MissingApiKeyError("anthropic");
    return new AnthropicProvider(key, process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514");
  }

  if (requested === "openai") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new MissingApiKeyError("openai");
    return new OpenAiProvider(key, process.env.OPENAI_MODEL || "gpt-4o");
  }

  // Auto-detect from whichever key is present (default: OpenAI-compatible)
  if (process.env.OPENAI_API_KEY) {
    return new OpenAiProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL || "gpt-4o");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514"
    );
  }
  throw new MissingApiKeyError("openai");
}

export function getProviderStatus(): { name: string; configured: boolean; model: string } {
  try {
    const p = getProvider();
    const model =
      p.name === "openai"
        ? process.env.OPENAI_MODEL || "gpt-4o"
        : p.name === "anthropic"
          ? process.env.ANTHROPIC_MODEL || "claude-sonnet-4"
          : "template engine";
    return { name: p.name, configured: true, model };
  } catch {
    return { name: process.env.AI_PROVIDER || "none", configured: false, model: "-" };
  }
}

/**
 * Offline provider used when AI_PROVIDER=mock (e.g. local dev / CI without keys).
 * Produces deterministic, strategy-aware scaffolding from the prompt so every
 * downstream flow (generate → save → repurpose → schedule) is fully exercisable.
 */
export class MockProvider implements AiProvider {
  readonly name = "mock" as const;

  async generate(opts: GenerateOptions): Promise<string> {
    const prompt = opts.messages.map((m) => m.content).join("\n");
    const format = /Format:\s*(.+)$/m.exec(prompt)?.[1] ?? "content";
    const topic = /Topic:\s*(.+)$/m.exec(prompt)?.[1] ?? "your topic";
    const brand = /voice:\s*(.+)$/m.exec(prompt)?.[1];
    const strategy = /Approach/i.test(prompt)
      ? /a ([\w-]+) approach/.exec(prompt)?.[1] ?? "direct"
      : "repurposed";
    const isRepurpose = /Repurpose/i.test(prompt);
    const cta = /call to action:\s*"([^"]+)"/.exec(prompt)?.[1];
    const keywords = /Include these keywords naturally:\s*(.+)$/m.exec(prompt)?.[1];

    const voice = brand ? `${brand} voice` : "a clear, professional voice";
    const kw = keywords ? `\n\nNaturally mentions: ${keywords}.` : "";
    const body = isRepurpose
      ? `Subject: ${topic} — now in a new format\n\nHere is the core message from the original piece, restructured for ${format} while keeping ${voice}.\n\n${cta ? `CTA: ${cta}.` : "Take the next step today."}${kw}`
      : `[${strategy} | ${format}] ${topic}\n\nWritten in ${voice}. This piece leads with its own distinct angle — ${strategy} in approach — so it reads differently from other variations on the same topic.\n\n${cta ? `CTA: ${cta}.` : "Ready when you are."}${kw}`;

    return JSON.stringify({ title: `${topic} (${strategy})`.slice(0, 80), body });
  }
}

export type { ChatMessage };
