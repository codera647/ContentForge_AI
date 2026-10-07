import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { syncGoogleSchedule } from "@/lib/calendar/google";
import { PublicApiError } from "@/lib/server-errors";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId: user.id } });
    if (!connection?.enabled) throw new PublicApiError("Connect Google Calendar before syncing.", 409, "google_connection_required");
    const schedules = await prisma.scheduledContent.findMany({
      where: { userId: user.id, OR: [
        { status: "pending", OR: [{ googleEventId: null }, { googleSyncError: { not: null } }] },
        { status: "cancelled", googleEventId: { not: null } },
      ] }, orderBy: { scheduledAt: "asc" }, take: 5, select: { id: true },
    });
    const results = await Promise.all(schedules.map((schedule) => syncGoogleSchedule(user.id, schedule.id)));
    return NextResponse.json({ synced: results.filter((result) => result.status === "synced").length, errors: results.filter((result) => result.status === "error").map((result) => result.error) });
  } catch (error) { return handleApiError(error, "google:sync", "Could not sync Google Calendar"); }
}
