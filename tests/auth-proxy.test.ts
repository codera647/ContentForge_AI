import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@clerk/nextjs/server", () => ({ clerkMiddleware: (handler: unknown) => handler }));
import proxy from "@/proxy";

const run = proxy as unknown as (auth: ReturnType<typeof makeAuth>, request: NextRequest) => Promise<void>;
function makeAuth(userId: string | null, reason = "session-token-expired") {
  return Object.assign(vi.fn(async () => ({
    userId, sessionStatus: null,
    debug: () => ({ reason, secretKey: "private-key", sessionToken: "private-session" }),
  })), { protect: vi.fn(async () => {}) });
}

describe("proxy authentication diagnostics", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("keeps authenticated pages protected without logging credentials", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const auth = makeAuth("user-a");
    await run(auth, new NextRequest("https://example.com/dashboard"));
    expect(auth.protect).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });
  it("logs only the reason and section when server verification fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const auth = makeAuth(null);
    await run(auth, new NextRequest("https://example.com/library/private-id?token=private-query"));
    expect(auth.protect).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledExactlyOnceWith("[auth] Protected page rejected", { section: "library", reason: "session-token-expired" });
  });
  it("leaves public sign-in and webhook verification to their own flows", async () => {
    const auth = makeAuth(null);
    await run(auth, new NextRequest("https://example.com/sign-in"));
    await run(auth, new NextRequest("https://example.com/api/webhooks/clerk"));
    expect(auth).not.toHaveBeenCalled();
    expect(auth.protect).not.toHaveBeenCalled();
  });
});
