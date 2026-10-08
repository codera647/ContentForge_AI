import "server-only";

import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PublicApiError } from "@/lib/server-errors";
import { assertActiveUser, syncClerkUser } from "@/lib/user-sync";
import { workspaceStep } from "@/lib/workspace-provisioning";

/** Cached only within a server render, never across users or requests. */
export const requireCurrentUser = cache(async () => {
  const { userId } = await workspaceStep("session", () => auth());
  if (!userId) throw new PublicApiError("Authentication required", 401, "unauthorized");
  const existing = await workspaceStep("database_read", () => prisma.user.findUnique({ where: { clerkUserId: userId } }));
  if (existing) { assertActiveUser(existing); return existing; }
  const profile = await workspaceStep("clerk_profile", () => currentUser());
  if (!profile || profile.id !== userId) {
    throw new PublicApiError("Authentication required", 401, "unauthorized");
  }
  return workspaceStep("database_write", () => syncClerkUser(profile));
});

/** Reuse existing workspaces; first login provisions through the same resolver as APIs. */
export const ensureCurrentWorkspace = requireCurrentUser;
