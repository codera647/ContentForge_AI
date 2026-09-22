import { NextResponse, type NextRequest } from "next/server";
import { prisma, getDefaultUserId } from "@/lib/prisma";
import { scheduleSchema } from "@/lib/ai/validation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const userId = await getDefaultUserId();
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const schedules = await prisma.scheduledContent.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              scheduledAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
        status: { not: "cancelled" },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        content: { select: { id: true, title: true, body: true, format: true, status: true, brand: { select: { name: true } } } },
      },
    });
    return NextResponse.json({ schedules });
  } catch (e) {
    console.error("[schedule:list]", e);
    return NextResponse.json({ error: "Failed to load schedules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getDefaultUserId();
    const parsed = scheduleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { contentId, platform, scheduledAt } = parsed.data;
    const when = new Date(scheduledAt);
    if (isNaN(when.getTime())) {
      return NextResponse.json({ error: "Invalid date/time" }, { status: 400 });
    }
    const content = await prisma.content.findFirst({ where: { id: contentId, userId } });
    if (!content) return NextResponse.json({ error: "Content not found" }, { status: 404 });

    const [schedule] = await prisma.$transaction([
      prisma.scheduledContent.create({
        data: { contentId, userId, platform: platform as never, scheduledAt: when },
      }),
      prisma.content.update({ where: { id: contentId }, data: { status: "scheduled" } }),
    ]);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (e) {
    console.error("[schedule:create]", e);
    return NextResponse.json({ error: "Failed to schedule content" }, { status: 500 });
  }
}
