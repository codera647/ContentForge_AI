import "server-only";

import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PublicApiError } from "@/lib/server-errors";
import { assertActiveUser, syncClerkUser } from "@/lib/user-sync";

/** Cached only within a server render, never across users or requests. */
export const requireCurrentUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) throw new PublicApiError("Authentication required", 401, "unauthorized");
  const existing = await prisma.user.findUnique({ where: { clerkUserId: userId } });
  if (existing) { assertActiveUser(existing); return existing; }
  const profile = await currentUser();
  if (!profile || profile.id !== userId) {
    throw new PublicApiError("Authentication required", 401, "unauthorized");
  }
  return syncClerkUser(profile);
});

/** Provision immediately after authentication; webhooks are not on the critical login path. */
export const ensureCurrentWorkspace = cache(async () => {
  const { userId } = await auth();
  if (!userId) throw new PublicApiError("Authentication required", 401, "unauthorized");
  const profile = await currentUser();
  if (!profile || profile.id !== userId) {
    throw new PublicApiError("Authentication required", 401, "unauthorized");
  }
  return syncClerkUser(profile);
});
