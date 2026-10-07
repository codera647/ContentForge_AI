import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PublicApiError } from "@/lib/server-errors";

export interface ClerkProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  imageUrl: string;
  primaryEmailAddressId: string | null;
  emailAddresses: { id: string; emailAddress: string; verification: { status: string } | null }[];
  updatedAt: number;
}

function identityConflict() {
  return new PublicApiError("This email is already linked to another account.", 409, "identity_conflict");
}

export function assertActiveUser(user: { deletedAt?: Date | null }) {
  if (user.deletedAt) {
    throw new PublicApiError("This account has been deactivated.", 403, "account_deactivated");
  }
}

/** Same resolver for first login and signed Clerk webhooks. Never trusts browser user IDs. */
export async function syncClerkUser(profile: ClerkProfile) {
  const primary = profile.emailAddresses.find((email) => email.id === profile.primaryEmailAddressId);
  if (!primary) {
    throw new PublicApiError("Add a primary email address to use your workspace.", 403, "identity_email_missing");
  }
  if (primary.verification?.status !== "verified") {
    throw new PublicApiError("Verify your email address before using ContentForge.", 403, "identity_email_unverified");
  }
  const email = primary.emailAddress.trim().toLowerCase();
  if (email === "owner@contentforge.local") {
    throw new PublicApiError("The legacy demo account cannot be linked to a login.", 409, "identity_conflict");
  }
  const clerkUpdatedAt = new Date(profile.updatedAt);
  if (Number.isNaN(clerkUpdatedAt.getTime())) throw new Error("Invalid Clerk profile timestamp");
  const data = {
    clerkUserId: profile.id, email,
    name: [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || profile.username || null,
    imageUrl: profile.imageUrl || null, clerkUpdatedAt,
  };

  // Unique constraints and conditional updates handle concurrent login/webhook delivery.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const existing = await prisma.user.findUnique({ where: { clerkUserId: profile.id } });
      if (existing) {
        assertActiveUser(existing);
        if (existing.clerkUpdatedAt && existing.clerkUpdatedAt >= clerkUpdatedAt) return existing;
        await prisma.user.updateMany({
          where: {
            id: existing.id, clerkUserId: profile.id, deletedAt: null,
            OR: [{ clerkUpdatedAt: null }, { clerkUpdatedAt: { lt: clerkUpdatedAt } }],
          }, data,
        });
        const updated = await prisma.user.findUnique({ where: { clerkUserId: profile.id } });
        if (updated) { assertActiveUser(updated); return updated; }
        continue;
      }
      const sameEmail = await prisma.user.findUnique({ where: { email } });
      if (sameEmail) {
        assertActiveUser(sameEmail);
        if (sameEmail.clerkUserId && sameEmail.clerkUserId !== profile.id) throw identityConflict();
        await prisma.user.updateMany({
          where: { id: sameEmail.id, clerkUserId: null, deletedAt: null }, data,
        });
        continue;
      }
      return await prisma.user.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        if (attempt < 2) continue;
        throw identityConflict();
      }
      throw error;
    }
  }
  throw identityConflict();
}
