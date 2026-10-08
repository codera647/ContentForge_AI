import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

vi.mock("server-only", () => ({}));

import { workspaceStep } from "@/lib/workspace-provisioning";
import { PublicApiError } from "@/lib/server-errors";

describe("workspace failure diagnostics", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("identifies database connectivity without exposing the connection string", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("postgresql://private-user:private-password@host/database"), { errorCode: "P1001" });
    await expect(workspaceStep("database_read", async () => { throw error; }))
      .rejects.toMatchObject({ status: 503, code: "workspace_database_read_P1001" });
    expect(log).toHaveBeenCalledExactlyOnceWith("[workspace] Provisioning failed", { stage: "database_read", code: "workspace_database_read_P1001" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-password");
  });

  it("distinguishes rejected Clerk backend credentials from a rejected user session", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(workspaceStep("clerk_profile", async () => { throw { status: 401, message: "private-key" }; }))
      .rejects.toMatchObject({ status: 503, code: "workspace_clerk_profile_http_401" });
  });

  it("preserves network error codes without printing the request or token", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new TypeError("private-token", { cause: { code: "ENOTFOUND" } });
    await expect(workspaceStep("clerk_profile", async () => { throw error; }))
      .rejects.toMatchObject({ code: "workspace_clerk_profile_ENOTFOUND" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-token");
  });

  it("does not expose arbitrary error codes", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(workspaceStep("database_write", async () => { throw { code: "private-key" }; }))
      .rejects.toMatchObject({ code: "workspace_database_write_unknown" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-key");
  });

  it("keeps account deactivation errors intact", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new PublicApiError("This account has been deactivated.", 403, "account_deactivated");
    await expect(workspaceStep("database_write", async () => { throw error; })).rejects.toBe(error);
    expect(log).not.toHaveBeenCalled();
  });

  it("rethrows Next.js redirects so they cannot become a workspace error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let redirectError: unknown;
    try { redirect("/sign-in"); } catch (error) { redirectError = error; }
    await expect(workspaceStep("session", async () => { throw redirectError; })).rejects.toBe(redirectError);
    expect(log).not.toHaveBeenCalled();
  });
});
