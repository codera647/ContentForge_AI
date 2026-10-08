import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
      create: mocks.create,
    },
  },
}));

import { requireCurrentUser, ensureCurrentWorkspace } from "@/lib/auth";
import { syncClerkUser } from "@/lib/user-sync";
import { Prisma } from "@prisma/client";
import { PublicApiError } from "@/lib/server-errors";

function clerkUser(email = "person@example.com") {
  return {
    id: "clerk-a",
    firstName: "Test",
    lastName: "Person",
    username: null,
    imageUrl: "https://example.com/avatar.png",
    updatedAt: Date.parse("2026-10-07T10:00:00Z"),
    primaryEmailAddressId: "email-a",
    emailAddresses: [
      {
        id: "email-a",
        emailAddress: email,
        verification: { status: "verified" },
      },
    ],
  };
}

describe("requireCurrentUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ userId: "clerk-a" });
  });

  it("rejects unauthenticated API requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    await expect(requireCurrentUser()).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    } satisfies Partial<PublicApiError>);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns an existing Prisma user without another Clerk backend lookup", async () => {
    mocks.findUnique.mockResolvedValue({ id: "user-a", clerkUserId: "clerk-a" });

    await expect(requireCurrentUser()).resolves.toMatchObject({ id: "user-a" });
    expect(mocks.currentUser).not.toHaveBeenCalled();
  });

  it("creates a separate Prisma user on first login", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mocks.currentUser.mockResolvedValue(clerkUser());
    mocks.create.mockResolvedValue({ id: "user-a", clerkUserId: "clerk-a" });

    await expect(requireCurrentUser()).resolves.toMatchObject({ id: "user-a" });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        clerkUserId: "clerk-a",
        email: "person@example.com",
        name: "Test Person",
        imageUrl: "https://example.com/avatar.png",
        clerkUpdatedAt: new Date("2026-10-07T10:00:00Z"),
      },
    });
  });

  it("never links a Clerk account to the legacy seeded owner", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.currentUser.mockResolvedValue(clerkUser("owner@contentforge.local"));

    await expect(requireCurrentUser()).rejects.toMatchObject({
      status: 409,
      code: "identity_conflict",
    } satisfies Partial<PublicApiError>);
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("provisions a workspace directly from a verified session before dashboard APIs run", async () => {
    mocks.currentUser.mockResolvedValue(clerkUser());
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "new-workspace", clerkUserId: "clerk-a" });
    await expect(ensureCurrentWorkspace()).resolves.toMatchObject({ id: "new-workspace" });
  });

  it("opens an existing workspace when Clerk profile requests are unavailable", async () => {
    mocks.findUnique.mockResolvedValue({ id: "user-a", clerkUserId: "clerk-a", deletedAt: null });
    mocks.currentUser.mockRejectedValue(new TypeError("fetch failed"));
    await expect(ensureCurrentWorkspace()).resolves.toMatchObject({ id: "user-a" });
    expect(mocks.currentUser).not.toHaveBeenCalled();
  });

  it("identifies a first-login Clerk profile failure without creating an unverified workspace", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockResolvedValue(null);
    mocks.currentUser.mockRejectedValue({ status: 403 });
    await expect(ensureCurrentWorkspace()).rejects.toMatchObject({ status: 503, code: "workspace_clerk_profile_http_403" });
    expect(mocks.create).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("refuses an unverified primary email even if another email is verified", async () => {
    const profile = clerkUser();
    profile.emailAddresses[0].verification.status = "unverified";
    await expect(syncClerkUser(profile)).rejects.toMatchObject({ code: "identity_email_unverified" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses profiles that do not belong to the authenticated session", async () => {
    mocks.currentUser.mockResolvedValue({ ...clerkUser(), id: "clerk-b" });
    await expect(ensureCurrentWorkspace()).rejects.toMatchObject({ status: 401 });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("updates changed names, avatars and verified primary email without changing workspace ownership", async () => {
    const existing = { id: "user-a", clerkUserId: "clerk-a", deletedAt: null, clerkUpdatedAt: new Date("2026-10-06T10:00:00Z") };
    mocks.findUnique.mockResolvedValue(existing);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    await syncClerkUser(clerkUser("NEW@example.com"));
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "user-a", clerkUserId: "clerk-a", deletedAt: null }),
      data: expect.objectContaining({ email: "new@example.com", name: "Test Person" }),
    }));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("ignores duplicate or older profile events", async () => {
    const existing = { id: "user-a", clerkUserId: "clerk-a", clerkUpdatedAt: new Date("2026-10-08T00:00:00Z") };
    mocks.findUnique.mockResolvedValue(existing);
    await expect(syncClerkUser(clerkUser())).resolves.toBe(existing);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("rejects access to deactivated accounts and never resurrects them", async () => {
    mocks.findUnique.mockResolvedValue({ id: "user-a", deletedAt: new Date() });
    await expect(requireCurrentUser()).rejects.toMatchObject({ code: "account_deactivated" });
    await expect(syncClerkUser(clerkUser())).rejects.toMatchObject({ code: "account_deactivated" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("links a verified legacy account using a conditional update", async () => {
    const linked = { id: "legacy-a", clerkUserId: "clerk-a", clerkUpdatedAt: new Date("2026-10-07T10:00:00Z") };
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "legacy-a", clerkUserId: null }).mockResolvedValueOnce(linked);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    await expect(syncClerkUser(clerkUser())).resolves.toBe(linked);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "legacy-a", clerkUserId: null, deletedAt: null } }));
  });

  it("does not transfer an email already owned by another Clerk identity", async () => {
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "user-b", clerkUserId: "clerk-b" });
    await expect(syncClerkUser(clerkUser())).rejects.toMatchObject({ code: "identity_conflict" });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("recovers when a webhook provisions the same user during first-login creation", async () => {
    const existing = { id: "user-a", clerkUserId: "clerk-a", clerkUpdatedAt: new Date("2026-10-07T10:00:00Z") };
    mocks.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    mocks.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("unique", { code: "P2002", clientVersion: "6" }));
    await expect(syncClerkUser(clerkUser())).resolves.toBe(existing);
  });
});
