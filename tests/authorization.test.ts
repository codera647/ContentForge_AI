import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PublicApiError } from "@/lib/server-errors";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  brandFindFirst: vi.fn(),
  contentFindFirst: vi.fn(),
  scheduleFindFirst: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brand: { findFirst: mocks.brandFindFirst },
    content: { findFirst: mocks.contentFindFirst },
    scheduledContent: { findFirst: mocks.scheduleFindFirst },
  },
}));

import { GET as getBrand } from "@/app/api/brands/[id]/route";
import { GET as getContent } from "@/app/api/content/[id]/route";
import { PATCH as updateSchedule } from "@/app/api/schedule/[id]/route";

const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("API ownership isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: "user-a" });
  });

  it("returns 401 when the API is called without an authenticated user", async () => {
    mocks.requireCurrentUser.mockRejectedValue(
      new PublicApiError("Authentication required", 401, "unauthorized")
    );

    const response = await getBrand(
      new NextRequest("http://localhost/api/brands/brand-a"),
      context("brand-a")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "unauthorized" });
  });

  it("does not let User A read User B's brand by guessing its ID", async () => {
    mocks.brandFindFirst.mockResolvedValue(null);

    const response = await getBrand(
      new NextRequest("http://localhost/api/brands/brand-b"),
      context("brand-b")
    );

    expect(mocks.brandFindFirst).toHaveBeenCalledWith({
      where: { id: "brand-b", userId: "user-a" },
    });
    expect(response.status).toBe(404);
  });

  it("does not let User A read User B's content by guessing its ID", async () => {
    mocks.contentFindFirst.mockResolvedValue(null);

    const response = await getContent(
      new NextRequest("http://localhost/api/content/content-b"),
      context("content-b")
    );

    expect(mocks.contentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "content-b", userId: "user-a" } })
    );
    expect(response.status).toBe(404);
  });

  it("does not let User A update User B's schedule by guessing its ID", async () => {
    mocks.scheduleFindFirst.mockResolvedValue(null);
    const request = new NextRequest("http://localhost/api/schedule/schedule-b", {
      method: "PATCH",
      body: JSON.stringify({ scheduledAt: "2026-10-01T10:00:00.000Z" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await updateSchedule(request, context("schedule-b"));

    expect(mocks.scheduleFindFirst).toHaveBeenCalledWith({
      where: { id: "schedule-b", userId: "user-a" },
    });
    expect(response.status).toBe(404);
  });
});
