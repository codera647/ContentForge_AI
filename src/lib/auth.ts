import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PublicApiError } from "@/lib/server-errors";

const LEGACY_SEED_EMAIL = "owner@contentforge.local";

function displayName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return null;
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.username || null;
}

/** Resolve the signed-in Clerk identity to one stable Prisma user. */
export async function requireCurrentUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new PublicApiError("Authentication required", 401, "unauthorized");
  }

  const existing = await prisma.user.findUnique({ where: { clerkUserId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) {
    throw new PublicApiError("Authentication required", 401, "unauthorized");
  }

  const primaryEmail =
    clerkUser.emailAddresses.find(
      (item) => item.id === clerkUser.primaryEmailAddressId
    ) ?? clerkUser.emailAddresses[0];

  if (!primaryEmail) {
    throw new PublicApiError(
      "Your account needs an email address before ContentForge can be used.",
      403,
      "identity_email_missing"
    );
  }

  if (primaryEmail.verification?.status !== "verified") {
    throw new PublicApiError(
      "Verify your email address before using ContentForge.",
      403,
      "identity_email_unverified"
    );
  }

  const email = primaryEmail.emailAddress.trim().toLowerCase();
  if (email === LEGACY_SEED_EMAIL) {
    throw new PublicApiError(
      "This email is reserved for legacy demo data and cannot be linked to a login.",
      409,
      "identity_conflict"
    );
  }

  const profile = {
    clerkUserId,
    name: displayName(clerkUser),
    imageUrl: clerkUser.imageUrl || null,
  };

  const sameEmail = await prisma.user.findUnique({ where: { email } });
  if (sameEmail) {
    if (sameEmail.clerkUserId && sameEmail.clerkUserId !== clerkUserId) {
      throw new PublicApiError(
        "This email is already linked to another account.",
        409,
        "identity_conflict"
      );
    }

    const linked = await prisma.user.updateMany({
      where: { id: sameEmail.id, clerkUserId: null },
      data: profile,
    });
    if (linked.count === 1) {
      const user = await prisma.user.findUnique({ where: { clerkUserId } });
      if (user) return user;
    }

    const concurrentlyLinked = await prisma.user.findUnique({ where: { clerkUserId } });
    if (concurrentlyLinked) return concurrentlyLinked;
    throw new PublicApiError(
      "This email is already linked to another account.",
      409,
      "identity_conflict"
    );
  }

  try {
    return await prisma.user.create({ data: { email, ...profile } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentlyCreated = await prisma.user.findUnique({ where: { clerkUserId } });
      if (concurrentlyCreated) return concurrentlyCreated;
      throw new PublicApiError(
        "This email is already linked to another account.",
        409,
        "identity_conflict"
      );
    }
    throw error;
  }
}
