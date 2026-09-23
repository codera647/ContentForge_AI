import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PublicApiError } from "@/lib/server-errors";

export const BRAND_LIMIT = 3;
export const AI_DAILY_LIMIT = 50;

export class BrandLimitError extends PublicApiError {
  constructor() {
    super(
      `You can create up to ${BRAND_LIMIT} brands. Delete a brand before creating another.`,
      409,
      "brand_limit_reached"
    );
  }
}

export class AiLimitError extends PublicApiError {
  constructor() {
    super(
      `You have reached the daily limit of ${AI_DAILY_LIMIT} AI operations. Try again tomorrow.`,
      429,
      "ai_limit_reached"
    );
  }
}

export async function createBrandWithinLimit(
  data: Prisma.BrandUncheckedCreateInput,
  client: Pick<PrismaClient, "$transaction"> = prisma
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await client.$transaction(
        async (tx) => {
          const count = await tx.brand.count({ where: { userId: data.userId } });
          if (count >= BRAND_LIMIT) throw new BrandLimitError();
          return tx.brand.create({ data });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt === 2) throw error;
    }
  }

  throw new Error("unreachable");
}

type UsageClient = Pick<PrismaClient, "aiUsage">;

export function utcUsageDay(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Reserve one accepted generation/repurpose operation atomically.
 * The reservation is intentionally not rolled back when the provider fails.
 */
export async function consumeAiOperation(
  userId: string,
  now = new Date(),
  client: UsageClient = prisma
) {
  const day = utcUsageDay(now);
  const incremented = await client.aiUsage.updateMany({
    where: { userId, day, count: { lt: AI_DAILY_LIMIT } },
    data: { count: { increment: 1 } },
  });
  if (incremented.count === 1) return;

  const existing = await client.aiUsage.findUnique({
    where: { userId_day: { userId, day } },
    select: { count: true },
  });
  if (existing) throw new AiLimitError();

  try {
    await client.aiUsage.create({ data: { userId, day, count: 1 } });
    return;
  } catch (error) {
    const raced =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    if (!raced) throw error;
  }

  const afterRace = await client.aiUsage.updateMany({
    where: { userId, day, count: { lt: AI_DAILY_LIMIT } },
    data: { count: { increment: 1 } },
  });
  if (afterRace.count === 0) throw new AiLimitError();
}
