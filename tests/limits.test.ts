import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const fallbackPrisma = vi.hoisted(() => ({
  aiUsage: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: fallbackPrisma }));

import {
  AI_DAILY_LIMIT,
  AiLimitError,
  BrandLimitError,
  consumeAiOperation,
  createBrandWithinLimit,
  utcUsageDay,
} from "@/lib/limits";

describe("server-side limits", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses a stable UTC date key", () => {
    expect(utcUsageDay(new Date("2026-09-23T23:59:59-07:00")).toISOString()).toBe(
      "2026-09-24T00:00:00.000Z"
    );
  });

  it("allows the 50th AI operation with one atomic increment", async () => {
    const client = {
      aiUsage: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    await consumeAiOperation("user-a", new Date("2026-09-23T12:00:00Z"), client as never);

    expect(client.aiUsage.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-a",
        day: new Date("2026-09-23T00:00:00.000Z"),
        count: { lt: AI_DAILY_LIMIT },
      },
      data: { count: { increment: 1 } },
    });
    expect(client.aiUsage.create).not.toHaveBeenCalled();
  });

  it("rejects the 51st AI operation", async () => {
    const client = {
      aiUsage: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue({ count: AI_DAILY_LIMIT }),
        create: vi.fn(),
      },
    };

    await expect(
      consumeAiOperation("user-a", new Date("2026-09-23T12:00:00Z"), client as never)
    ).rejects.toBeInstanceOf(AiLimitError);
    expect(client.aiUsage.create).not.toHaveBeenCalled();
  });

  it("creates the daily usage row for a user's first operation", async () => {
    const client = {
      aiUsage: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await consumeAiOperation("user-b", new Date("2026-09-23T12:00:00Z"), client as never);

    expect(client.aiUsage.create).toHaveBeenCalledWith({
      data: {
        userId: "user-b",
        day: new Date("2026-09-23T00:00:00.000Z"),
        count: 1,
      },
    });
  });

  it("allows a third brand but rejects a fourth brand", async () => {
    const create = vi.fn().mockResolvedValue({ id: "brand-3" });
    const count = vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    const transaction = vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({ brand: { count, create } })
    );
    const client = { $transaction: transaction };
    const data = { userId: "user-a", name: "Third brand" };

    await expect(createBrandWithinLimit(data, client as never)).resolves.toMatchObject({
      id: "brand-3",
    });
    await expect(
      createBrandWithinLimit({ ...data, name: "Fourth brand" }, client as never)
    ).rejects.toBeInstanceOf(BrandLimitError);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
