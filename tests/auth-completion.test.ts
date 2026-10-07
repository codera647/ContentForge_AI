import { describe, expect, it, vi } from "vitest";
import { verifyWorkspaceSession } from "@/lib/auth-completion";

describe("post-signup workspace verification", () => {
  it("opens the dashboard only after the server accepts the session", async () => {
    const refresh = vi.fn();
    expect(await verifyWorkspaceSession(async () => new Response("{}"), refresh)).toEqual({ ready: true });
    expect(refresh).not.toHaveBeenCalled();
  });
  it("refreshes an expired session once before checking again", async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 401 })).mockResolvedValueOnce(new Response("{}"));
    const refresh = vi.fn().mockResolvedValue(null);
    expect(await verifyWorkspaceSession(request, refresh)).toEqual({ ready: true });
    expect(refresh).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("stops the sign-in/dashboard loop if the server still rejects a signed-in client", async () => {
    const request = vi.fn(async () => new Response("{}", { status: 401 }));
    expect(await verifyWorkspaceSession(request, vi.fn())).toMatchObject({ ready: false, error: expect.stringContaining("authentication configuration") });
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("reports database failures without treating them as a logout", async () => {
    const refresh = vi.fn();
    expect(await verifyWorkspaceSession(async () => Response.json({ error: "Workspace unavailable" }, { status: 500 }), refresh)).toEqual({ ready: false, error: "Workspace unavailable" });
    expect(refresh).not.toHaveBeenCalled();
  });
  it("provides a retry message when the network is unavailable", async () => {
    expect(await verifyWorkspaceSession(async () => { throw new Error("offline"); }, vi.fn())).toMatchObject({ ready: false, error: expect.stringContaining("connection") });
  });
});
