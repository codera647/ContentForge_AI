import { NextResponse, type NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { handleApiError, readJson } from "@/lib/api-errors";
import { scheduleUpdateSchema } from "@/lib/ai/validation";
import { cancelSchedule, updateSchedule } from "@/lib/scheduling";
import { syncGoogleSchedule } from "@/lib/calendar/google";

export const runtime = "nodejs";
export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    const parsed = scheduleUpdateSchema.safeParse(await readJson(req));
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 400 });
    const schedule = await updateSchedule(userId, id, parsed.data);
    const calendarSync = await syncGoogleSchedule(userId, id);
    return NextResponse.json({ schedule, calendarSync });
  } catch (error) { return handleApiError(error, "schedule:update", "Failed to update schedule"); }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { id: userId } = await requireCurrentUser();
    await cancelSchedule(userId, id);
    const calendarSync = await syncGoogleSchedule(userId, id);
    return NextResponse.json({ ok: true, calendarSync });
  } catch (error) { return handleApiError(error, "schedule:delete", "Failed to cancel schedule"); }
}
