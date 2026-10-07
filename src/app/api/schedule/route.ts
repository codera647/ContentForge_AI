import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleSchema } from "@/lib/ai/validation";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError, readJson } from "@/lib/api-errors";
import { createSchedule } from "@/lib/scheduling";
import { syncGoogleSchedule } from "@/lib/calendar/google";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  try {
    const { id: userId } = await requireCurrentUser();
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    if ((from && Number.isNaN(new Date(from).getTime())) || (to && Number.isNaN(new Date(to).getTime())) || (from && to && new Date(from) > new Date(to))) {
      return NextResponse.json({ error: "Invalid calendar date range" }, { status: 400 });
    }
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
        status: "pending",
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        content: { select: { id: true, title: true, body: true, format: true, status: true, brand: { select: { name: true } } } },
      },
    });
    return NextResponse.json({ schedules });
  } catch (e) {
    return handleApiError(e, "schedule:list", "Failed to load schedules");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id: userId } = await requireCurrentUser();
    const parsed = scheduleSchema.safeParse(await readJson(req));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const schedule = await createSchedule(userId, parsed.data);
    const calendarSync = await syncGoogleSchedule(userId, schedule.id);
    return NextResponse.json({ schedule, calendarSync }, { status: 201 });
  } catch (e) {
    return handleApiError(e, "schedule:create", "Failed to schedule content");
  }
}
