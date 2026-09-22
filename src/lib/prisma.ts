import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * This build of the app is single-tenant (no auth). All data belongs to a
 * default user row which is created lazily. Swap for real auth when needed.
 */
export async function getDefaultUserId(): Promise<string> {
  const email = "owner@contentforge.local";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "ContentForge Owner" },
  });
  return user.id;
}
