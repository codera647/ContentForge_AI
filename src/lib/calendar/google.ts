import "server-only";

import { createHash } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { PublicApiError } from "@/lib/server-errors";
import { CONTENT_TYPE_LABELS } from "@/lib/constants";
import { GOOGLE_CALENDAR_SCOPE } from "./constants";

const GOOGLE_API = "https://www.googleapis.com/calendar/v3";
const WRITE_SCOPES = [GOOGLE_CALENDAR_SCOPE, "https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events.owned"];
export type CalendarSyncResult = { status: "synced" | "skipped" | "error"; error?: string };

export async function googleToken(clerkUserId: string, externalAccountId?: string) {
  const client = await clerkClient();
  let tokens;
  try { tokens = await client.users.getUserOauthAccessToken(clerkUserId, "google"); }
  catch {
    throw new PublicApiError("Connect or reconnect your Google account to enable calendar sync.", 409, "google_connection_required");
  }
  const token = tokens.data.find((item) => !externalAccountId || item.externalAccountId === externalAccountId);
  if (!token || !token.scopes?.some((scope) => WRITE_SCOPES.includes(scope))) {
    throw new PublicApiError("Allow Google Calendar access to sync your scheduled content.", 409, "google_permission_required");
  }
  return token;
}

async function googleRequest(token: string, path: string, init?: RequestInit) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response: Response;
    try {
      response = await fetch(`${GOOGLE_API}${path}`, {
        ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000), cache: "no-store",
      });
    } catch {
      if (attempt < 2) continue;
      throw new PublicApiError("Google Calendar is unavailable. Your content schedule is saved; retry sync shortly.", 502, "google_unavailable");
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      await response.text();
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      throw new PublicApiError("Google Calendar access was denied. Reconnect your Google account and allow calendar access.", 409, "google_permission_required");
    }
    return response;
  }
  throw new Error("Google retry exhausted");
}

/** Validate access without creating an event before enabling sync. */
export async function connectGoogleCalendar(userId: string, clerkUserId: string) {
  const existing = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  const token = await googleToken(clerkUserId, existing?.externalAccountId);
  const response = await googleRequest(token.token, "/calendars/primary/events?maxResults=1");
  if (!response.ok) throw new PublicApiError("Could not access your primary Google calendar.", 502, "google_unavailable");
  return prisma.googleCalendarConnection.upsert({
    where: { userId },
    create: { userId, externalAccountId: token.externalAccountId },
    update: { externalAccountId: token.externalAccountId, enabled: true },
  });
}

export function googleEventId(scheduleId: string) {
  // Google's base32hex ID rules accept hexadecimal; deterministic IDs prevent duplicates on retries.
  return createHash("sha256").update(`contentforge:${scheduleId}`).digest("hex");
}

export function googleEventBody(schedule: { scheduledAt: Date; platform: string; content: { title: string; body: string } }) {
  return {
    summary: `${CONTENT_TYPE_LABELS[schedule.platform] ?? schedule.platform}: ${schedule.content.title}`.slice(0, 300),
    description: schedule.content.body.slice(0, 8000),
    start: { dateTime: schedule.scheduledAt.toISOString() },
    end: { dateTime: new Date(schedule.scheduledAt.getTime() + 15 * 60 * 1000).toISOString() },
    transparency: "transparent", status: "confirmed",
  };
}

/** Serialize external writes per schedule so concurrent edits/cancellation cannot reorder Google events. */
export async function syncGoogleSchedule(userId: string, scheduleId: string): Promise<CalendarSyncResult> {
  try {
    const initial = await prisma.scheduledContent.findFirst({ where: { id: scheduleId, userId }, include: { user: { include: { googleCalendar: true } } } });
    const initialConnection = initial?.user.googleCalendar;
    if (initial?.status === "pending" && initialConnection?.enabled && !initial.googleEventId) {
      // Commit event identity independently of the network transaction so even a transaction timeout is recoverable.
      await prisma.scheduledContent.updateMany({ where: { id: scheduleId, userId, status: "pending", googleEventId: null }, data: {
        googleEventId: googleEventId(scheduleId), googleCalendarId: initialConnection.calendarId,
        googleExternalAccountId: initialConnection.externalAccountId, googleSyncError: "Waiting for Google Calendar sync.",
      } });
    }
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scheduleId}))`;
      const schedule = await tx.scheduledContent.findFirst({
        where: { id: scheduleId, userId },
        include: { content: true, user: { include: { googleCalendar: true } } },
      });
      if (!schedule) return { status: "skipped" };
      const connection = schedule.user.googleCalendar;
      if (!connection?.enabled || schedule.user.deletedAt || !schedule.user.clerkUserId) {
        if (schedule.googleEventId) await tx.scheduledContent.updateMany({ where: { id: scheduleId, userId }, data: { googleSyncError: "Google Calendar sync is paused. Reconnect to sync these changes." } });
        return { status: "skipped" };
      }
      if (schedule.status !== "pending" && !schedule.googleEventId) return { status: "skipped" };

      try {
        const token = await googleToken(schedule.user.clerkUserId, schedule.googleExternalAccountId ?? connection.externalAccountId);
        const eventId = schedule.googleEventId ?? googleEventId(schedule.id);
        const calendarId = schedule.googleCalendarId ?? connection.calendarId;
        const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
        const eventPath = `${base}/${encodeURIComponent(eventId)}`;
        if (schedule.status !== "pending") {
          const response = await googleRequest(token.token, eventPath, { method: "DELETE" });
          if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error("Google event deletion failed");
          await tx.scheduledContent.updateMany({ where: { id: scheduleId, userId }, data: {
            googleEventId: null, googleEventUrl: null, googleCalendarId: null, googleExternalAccountId: null, googleSyncError: null,
          } });
          return { status: "synced" };
        }

        // Record identity before the request so a timed-out insert remains retryable/cancellable.
        await tx.scheduledContent.updateMany({ where: { id: scheduleId, userId }, data: {
          googleEventId: eventId, googleCalendarId: calendarId, googleExternalAccountId: token.externalAccountId,
        } });
        const body = googleEventBody(schedule);
        let response = await googleRequest(token.token, eventPath, { method: "PATCH", body: JSON.stringify(body) });
        if (response.status === 404) {
          response = await googleRequest(token.token, base, { method: "POST", body: JSON.stringify({ id: eventId, ...body }) });
          if (response.status === 409) response = await googleRequest(token.token, eventPath, { method: "PATCH", body: JSON.stringify(body) });
        }
        if (!response.ok) throw new Error("Google event synchronization failed");
        const event = await response.json() as { htmlLink?: string };
        await tx.scheduledContent.updateMany({ where: { id: scheduleId, userId }, data: { googleEventUrl: event.htmlLink ?? null, googleSyncError: null } });
        return { status: "synced" };
      } catch (error) {
        const message = error instanceof PublicApiError ? error.message : "Your schedule is saved. Google Calendar sync failed; try again.";
        await tx.scheduledContent.updateMany({ where: { id: scheduleId, userId }, data: { googleSyncError: message } });
        return { status: "error", error: message };
      }
    }, { maxWait: 10_000, timeout: 90_000 });
  } catch {
    const message = "Your schedule is saved. Google Calendar sync is waiting; try again.";
    await prisma.scheduledContent.updateMany({ where: { id: scheduleId, userId }, data: { googleSyncError: message } }).catch(() => {});
    return { status: "error", error: message };
  }
}
