import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PublicApiError } from "@/lib/server-errors";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  brandFindFirst: vi.fn(),
  brandCount: vi.fn(),
  contentFindFirst: vi.fn(),
  contentCount: vi.fn(),
  contentFindMany: vi.fn(),
  scheduleFindFirst: vi.fn(),
  scheduleFindMany: vi.fn(),
  getProviderStatus: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brand: { findFirst: mocks.brandFindFirst, count: mocks.brandCount },
    content: {
      findFirst: mocks.contentFindFirst,
      count: mocks.contentCount,
      findMany: mocks.contentFindMany,
    },
    scheduledContent: {
      findFirst: mocks.scheduleFindFirst,
      findMany: mocks.scheduleFindMany,
    },
  },
}));

vi.mock("@/lib/ai/provider", () => ({
  getProviderStatus: mocks.getProviderStatus,
}));

import { GET as getBrand } from "@/app/api/brands/[id]/route";
import { GET as getContent } from "@/app/api/content/[id]/route";
import { PATCH as updateSchedule } from "@/app/api/schedule/[id]/route";
import { GET as getStats } from "@/app/api/stats/route";

const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("API ownership isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentUser.mockResolvedValue({ id: "user-a" });
    mocks.contentCount.mockResolvedValue(0);
    mocks.brandCount.mockResolvedValue(0);
    mocks.contentFindMany.mockResolvedValue([]);
    mocks.scheduleFindMany.mockResolvedValue([]);
    mocks.getProviderStatus.mockReturnValue({
      name: "mock",
      configured: true,
      model: "test",
    });
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

  it("returns an empty dashboard scoped to the authenticated Stage 2 user", async () => {
    const response = await getStats();

    expect(mocks.requireCurrentUser).toHaveBeenCalledOnce();
    expect(mocks.contentCount).toHaveBeenCalledTimes(5);
    for (const [query] of mocks.contentCount.mock.calls) {
      expect(query.where).toMatchObject({ userId: "user-a" });
    }
    expect(mocks.brandCount).toHaveBeenCalledWith({ where: { userId: "user-a" } });
    expect(mocks.contentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-a" } })
    );
    expect(mocks.scheduleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "user-a" }) })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      stats: {
        totalContent: 0,
        drafts: 0,
        scheduled: 0,
        published: 0,
        archived: 0,
        brands: 0,
      },
      recent: [],
      upcoming: [],
    });
  });
});
