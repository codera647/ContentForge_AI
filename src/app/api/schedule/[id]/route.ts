import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const body = (await req.json()) as { scheduledAt?: string; platform?: string };
    const existing = await prisma.scheduledContent.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    const when = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
    if (when && isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
    }
    await prisma.scheduledContent.updateMany({
      where: { id, userId },
      data: {
        ...(when ? { scheduledAt: when } : {}),
        ...(body.platform ? { platform: body.platform as never } : {}),
      },
    });
    const schedule = await prisma.scheduledContent.findFirst({ where: { id, userId } });
    return NextResponse.json({ schedule });
  } catch (e) {
    return handleApiError(e, "schedule:update", "Failed to update schedule");
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const existing = await prisma.scheduledContent.findFirst({
      where: { id, userId },
      include: { content: { select: { status: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.scheduledContent.updateMany({
        where: { id, userId },
        data: { status: "cancelled" },
      }),
      ...(existing.content.status === "scheduled"
        ? [
            prisma.content.updateMany({
              where: { id: existing.contentId, userId },
              data: { status: "draft" },
            }),
          ]
        : []),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e, "schedule:delete", "Failed to cancel schedule");
  }
}
