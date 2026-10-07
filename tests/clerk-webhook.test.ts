import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ verify: vi.fn(), sync: vi.fn(), find: vi.fn(), update: vi.fn(), disconnect: vi.fn() }));
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: mocks.verify }));
vi.mock("@/lib/user-sync", () => ({ syncClerkUser: mocks.sync }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(async (callback) => callback({
  user: { findUnique: mocks.find, updateMany: mocks.update }, googleCalendarConnection: { updateMany: mocks.disconnect },
})) } }));
import { POST } from "@/app/api/webhooks/clerk/route";

const req = () => new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST", body: "{}" });
describe("signed Clerk user lifecycle", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "test-signing-secret"); });
  it("rejects an invalid signature before touching user data", async () => {
    mocks.verify.mockRejectedValueOnce(new Error("invalid signature"));
    expect((await POST(req())).status).toBe(400);
    expect(mocks.sync).not.toHaveBeenCalled();
  });
  it("synchronizes verified created/updated profile payloads", async () => {
    mocks.verify.mockResolvedValue({ type: "user.created", data: {
      id: "clerk-a", first_name: "A", last_name: null, username: null, image_url: "", updated_at: 1,
      primary_email_address_id: "email-a", email_addresses: [{ id: "email-a", email_address: "a@example.com", verification: { status: "verified" } }],
    } });
    expect((await POST(req())).status).toBe(200);
    expect(mocks.sync).toHaveBeenCalledWith(expect.objectContaining({ id: "clerk-a", primaryEmailAddressId: "email-a" }));
  });
  it("deactivates deleted accounts and pauses sync while preserving their content", async () => {
    mocks.verify.mockResolvedValue({ type: "user.deleted", data: { id: "clerk-a" } });
    mocks.find.mockResolvedValue({ id: "user-a" });
    expect((await POST(req())).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "user-a", deletedAt: null }, data: { deletedAt: expect.any(Date) } });
    expect(mocks.disconnect).toHaveBeenCalledWith({ where: { userId: "user-a" }, data: { enabled: false } });
  });
  it("returns a retryable error if webhook configuration is missing", async () => {
    vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "");
    expect((await POST(req())).status).toBe(503);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
});
