import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-errors";
import { connectGoogleCalendar } from "@/lib/calendar/google";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId: user.id } });
    const pending = await prisma.scheduledContent.count({ where: {
      userId: user.id, OR: [
        { status: "pending", OR: [{ googleEventId: null }, { googleSyncError: { not: null } }] },
        { status: "cancelled", googleEventId: { not: null } },
      ],
    } });
    return NextResponse.json({ connected: !!connection?.enabled, pending, calendar: "Primary Google calendar" });
  } catch (error) { return handleApiError(error, "google:status", "Could not load calendar connection"); }
}

export async function POST() {
  try {
    const user = await requireCurrentUser();
    await connectGoogleCalendar(user.id, user.clerkUserId!);
    return NextResponse.json({ connected: true });
  } catch (error) { return handleApiError(error, "google:connect", "Could not connect Google Calendar"); }
}

export async function DELETE() {
  try {
    const user = await requireCurrentUser();
    await prisma.googleCalendarConnection.updateMany({ where: { userId: user.id }, data: { enabled: false } });
    return NextResponse.json({ connected: false });
  } catch (error) { return handleApiError(error, "google:disconnect", "Could not pause calendar sync"); }
}
