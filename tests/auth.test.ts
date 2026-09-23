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

import { requireCurrentUser } from "@/lib/auth";
import { PublicApiError } from "@/lib/server-errors";

function clerkUser(email = "person@example.com") {
  return {
    id: "clerk-a",
    firstName: "Test",
    lastName: "Person",
    username: null,
    imageUrl: "https://example.com/avatar.png",
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
    vi.clearAllMocks();
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
});
