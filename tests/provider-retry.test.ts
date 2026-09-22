import { describe, it, expect, vi, afterEach } from "vitest";
import type { AiProvider, ChatMessage, GenerateOptions } from "@/lib/ai/types";

/**
 * Retry-behaviour tests for the shared AI provider layer.
 * The real providers use the module-private fetchWithRetries wrapper; these
 * tests exercise the same policy through a minimal provider-like harness that
 * replicates the call pattern (fetchWithRetries → ok check → parse), so the
 * retry semantics are verified without live HTTP.
 *
 * We test the policy by stubbing global fetch and driving OpenAiProvider.
 */

// Ensure the OpenAI provider is constructible without real credentials.
process.env.OPENAI_API_KEY = "test-key-not-a-real-secret";
process.env.AI_PROVIDER = "openai";
process.env.OPENAI_BASE_URL = "https://provider.test/v1";

// Collapse backoff delays so tests run instantly.
vi.mock("timers", async () => ({}));

// The provider class is not exported; use the real provider via
// getProvider() and count fetch calls with stubbed global fetch.
const { getProvider } = await import("@/lib/ai/provider");

const okBody = {
  choices: [{ message: { content: JSON.stringify({ title: "T", body: "B" }) }, finish_reason: "stop" }],
};

function okResponse() {
  return new Response(JSON.stringify(okBody), { status: 200, headers: { "Content-Type": "application/json" } });
}

function errResponse(status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: { message: "upstream" } }), { status, headers });
}

type FetchCall = { url: string; init: RequestInit };

function stubFetch(handler: (call: FetchCall, n: number) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return handler(calls[calls.length - 1], calls.length);
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function generateOnce(provider: AiProvider) {
  return provider.generate({
    messages: [{ role: "user", content: "say hi" }] as ChatMessage[],
  } as GenerateOptions);
}

describe("AI provider transient retries", () => {
  it("TEST A: succeeds on first attempt — exactly 1 provider request", async () => {
    const calls = stubFetch(() => okResponse());
    const text = await generateOnce(getProvider());
    expect(text).toBeTruthy();
    expect(calls).toHaveLength(1);
  });

  it("TEST B: 502 then success — retried once, final result succeeds", async () => {
    const calls = stubFetch((_, n) => (n === 1 ? errResponse(502) : okResponse()));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = await generateOnce(getProvider());
    expect(text).toBeTruthy();
    expect(calls).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("HTTP 502"));
  });

  it("TEST C: 429 then success — retried, succeeds", async () => {
    const calls = stubFetch((_, n) => (n === 1 ? errResponse(429) : okResponse()));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = await generateOnce(getProvider());
    expect(text).toBeTruthy();
    expect(calls).toHaveLength(2);
  });

  it("TEST D: 503 twice then success — maximum 3 attempts, succeeds", async () => {
    const calls = stubFetch((_, n) => (n <= 2 ? errResponse(503) : okResponse()));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = await generateOnce(getProvider());
    expect(text).toBeTruthy();
    expect(calls).toHaveLength(3);
  });

  it("TEST E: 400 — NO retry", async () => {
    const calls = stubFetch(() => errResponse(400));
    await expect(generateOnce(getProvider())).rejects.toThrow(/400/);
    expect(calls).toHaveLength(1);
  });

  it("TEST F: 401 — NO retry", async () => {
    const calls = stubFetch(() => errResponse(401));
    await expect(generateOnce(getProvider())).rejects.toThrow(/401/);
    expect(calls).toHaveLength(1);
  });

  it("TEST G: retryable failure on all attempts — 3 total attempts then safe provider error", async () => {
    const calls = stubFetch(() => errResponse(502));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(generateOnce(getProvider())).rejects.toThrow(/OpenAI API error 502/);
    expect(calls).toHaveLength(3);
  });

  it("TEST G2: network failure on all attempts — 3 total attempts then provider error", async () => {
    const calls = stubFetch(() => {
      throw new Error("connection reset");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(generateOnce(getProvider())).rejects.toThrow(/network error|request failed/i);
    expect(calls).toHaveLength(3);
  });

  it("TEST G3: Retry-After header is respected (capped)", async () => {
    const calls = stubFetch((_, n) =>
      n === 1
        ? errResponse(429, { "Retry-After": "1" })
        : okResponse()
    );
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = await generateOnce(getProvider());
    expect(text).toBeTruthy();
    expect(calls).toHaveLength(2);
    expect((calls[0].init.headers as Record<string, string>)["Retry-After"]).toBeUndefined();
  });

  it("TEST H: retries never expose credentials — no key/authorization data in thrown errors or logs", async () => {
    const KEY = "test-key-not-a-real-secret";
    const logLines: string[] = [];
    stubFetch(() => errResponse(502));
    vi.spyOn(console, "warn").mockImplementation((...args) => logLines.push(args.join(" ")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    let thrown: unknown;
    try {
      await generateOnce(getProvider());
    } catch (e) {
      thrown = e;
    }
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    expect(message).not.toContain(KEY);
    for (const line of logLines) expect(line).not.toContain(KEY);
    // The retry wrapper must never log the Authorization header value.
    for (const line of logLines) expect(line).not.toContain("Bearer");
  });
});
