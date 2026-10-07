import "server-only";
import type { ContentType } from "@prisma/client";
import { serializableTransaction } from "@/lib/db-transaction";
import { PublicApiError } from "@/lib/server-errors";

export function createSchedule(userId: string, input: { contentId: string; platform: ContentType; scheduledAt: string }) {
  return serializableTransaction(async (tx) => {
    const content = await tx.content.findFirst({ where: { id: input.contentId, userId } });
    if (!content) throw new PublicApiError("Content not found", 404, "not_found");
    if (content.status === "archived") throw new PublicApiError("Restore this content to Draft before scheduling it.", 409, "content_archived");
    const schedule = await tx.scheduledContent.create({
      data: { userId, contentId: content.id, platform: input.platform, scheduledAt: new Date(input.scheduledAt) },
    });
    await tx.content.updateMany({ where: { id: content.id, userId }, data: { status: "scheduled" } });
    return schedule;
  });
}

export function updateSchedule(userId: string, id: string, input: { platform?: ContentType; scheduledAt?: string }) {
  return serializableTransaction(async (tx) => {
    const existing = await tx.scheduledContent.findFirst({ where: { id, userId } });
    if (!existing) throw new PublicApiError("Schedule not found", 404, "not_found");
    if (existing.status !== "pending") {
      throw new PublicApiError("This schedule is no longer active. Create a new schedule for this content.", 409, "schedule_inactive");
    }
    await tx.scheduledContent.updateMany({
      where: { id, userId, status: "pending" },
      data: { googleSyncError: existing.googleEventId ? "Waiting for Google Calendar sync." : null, ...(input.platform ? { platform: input.platform } : {}), ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}) },
    });
    await tx.content.updateMany({ where: { id: existing.contentId, userId }, data: { status: "scheduled" } });
    return tx.scheduledContent.findFirstOrThrow({ where: { id, userId } });
  });
}

export function cancelSchedule(userId: string, id: string) {
  return serializableTransaction(async (tx) => {
    const existing = await tx.scheduledContent.findFirst({ where: { id, userId } });
    if (!existing) throw new PublicApiError("Schedule not found", 404, "not_found");
    await tx.scheduledContent.updateMany({ where: { id, userId }, data: { status: "cancelled" } });
    const remaining = await tx.scheduledContent.count({ where: { contentId: existing.contentId, userId, status: "pending" } });
    if (remaining === 0) {
      await tx.content.updateMany({ where: { id: existing.contentId, userId, status: "scheduled" }, data: { status: "draft" } });
    }
    return existing;
  });
}
