import { NextResponse, type NextRequest } from "next/server";
import { prisma, getDefaultUserId } from "@/lib/prisma";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
    const body = (await req.json()) as { scheduledAt?: string; platform?: string };
    const existing = await prisma.scheduledContent.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    const when = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
    if (when && isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
    }
    const schedule = await prisma.scheduledContent.update({
      where: { id },
      data: {
        ...(when ? { scheduledAt: when } : {}),
        ...(body.platform ? { platform: body.platform as never } : {}),
      },
    });
    return NextResponse.json({ schedule });
  } catch (e) {
    console.error("[schedule:update]", e);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const userId = await getDefaultUserId();
    const existing = await prisma.scheduledContent.findFirst({
      where: { id, userId },
      include: { content: { select: { status: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.scheduledContent.update({ where: { id }, data: { status: "cancelled" } }),
      ...(existing.content.status === "scheduled"
        ? [prisma.content.update({ where: { id: existing.contentId }, data: { status: "draft" } })]
        : []),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[schedule:delete]", e);
    return NextResponse.json({ error: "Failed to cancel schedule" }, { status: 500 });
  }
}
