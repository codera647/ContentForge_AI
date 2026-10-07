import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { contentUpdateSchema } from "@/lib/ai/validation";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError, readJson } from "@/lib/api-errors";
import { serializableTransaction } from "@/lib/db-transaction";
import { syncGoogleSchedule } from "@/lib/calendar/google";
import { PublicApiError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const content = await prisma.content.findFirst({
      where: { id, userId },
      include: {
        brand: true,
        schedules: { where: { status: "pending" }, orderBy: { scheduledAt: "asc" } },
        source: { select: { title: true, id: true } },
        repurposed: { select: { title: true, id: true, format: true } },
      },
    });
    if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    return NextResponse.json({ content });
  } catch (e) {
    return handleApiError(e, "content:get", "Failed to load content");
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const parsed = contentUpdateSchema.partial().safeParse(await readJson(req));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const schedules = await serializableTransaction(async (tx) => {
      const existing = await tx.content.findFirst({ where: { id, userId } });
      if (!existing) throw new PublicApiError("Content not found", 404, "not_found");
      const pending = await tx.scheduledContent.findMany({ where: { contentId: id, userId, status: "pending" }, select: { id: true } });
      if (parsed.data.status === "scheduled" && pending.length === 0) {
        throw new PublicApiError("Choose a date and time using Schedule to mark this content as scheduled.", 400, "schedule_required");
      }
      if (parsed.data.status && parsed.data.status !== "scheduled") {
        await tx.scheduledContent.updateMany({ where: { contentId: id, userId, status: "pending" }, data: { status: "cancelled" } });
      } else {
        await tx.scheduledContent.updateMany({ where: { contentId: id, userId, status: "pending", googleEventId: { not: null } }, data: { googleSyncError: "Waiting for Google Calendar sync." } });
      }
      await tx.content.updateMany({ where: { id, userId }, data: parsed.data });
      return pending;
    });
    const calendarSync = await Promise.all(schedules.map((schedule) => syncGoogleSchedule(userId, schedule.id)));
    const content = await prisma.content.findFirst({ where: { id, userId }, include: {
      brand: true, schedules: { where: { status: "pending" }, orderBy: { scheduledAt: "asc" } },
      repurposed: { select: { id: true, title: true, format: true } },
    } });
    return NextResponse.json({ content, calendarSync });
  } catch (e) {
    return handleApiError(e, "content:update", "Failed to update content");
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const schedules = await serializableTransaction(async (tx) => {
      const existing = await tx.content.findFirst({ where: { id, userId } });
      if (!existing) throw new PublicApiError("Content not found", 404, "not_found");
      await tx.scheduledContent.updateMany({ where: { contentId: id, userId, status: "pending" }, data: { status: "cancelled" } });
      await tx.content.updateMany({ where: { id, userId }, data: { status: "archived" } });
      return tx.scheduledContent.findMany({ where: { contentId: id, userId, googleEventId: { not: null } }, select: { id: true } });
    });
    const results = await Promise.all(schedules.map((schedule) => syncGoogleSchedule(userId, schedule.id)));
    if (results.some((result) => result.status !== "synced")) {
      throw new PublicApiError("Content was kept because its Google Calendar events could not be removed. Reconnect Google Calendar and retry deleting.", 502, "google_cleanup_required");
    }
    const deleted = await prisma.content.deleteMany({ where: { id, userId } });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "content:delete", "Failed to delete content");
  }
}

export async function POST(_req: NextRequest, ctx: Ctx) {
  // POST = duplicate
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const existing = await prisma.content.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Content not found" }, { status: 404 });
    const copy = await prisma.content.create({
      data: {
        userId: existing.userId,
        brandId: existing.brandId,
        title: `${existing.title} (copy)`,
        body: existing.body,
        format: existing.format,
        topic: existing.topic,
        audience: existing.audience,
        objective: existing.objective,
        tone: existing.tone,
        keywords: existing.keywords,
        cta: existing.cta,
        status: "draft",
        sourceContentId: existing.sourceContentId,
        variationIndex: existing.variationIndex,
      } as never,
    });
    return NextResponse.json({ content: copy }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "content:duplicate", "Failed to duplicate content");
  }
}
