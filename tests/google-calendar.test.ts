import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ tokens: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), connection: vi.fn(), execute: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn(async () => ({ users: { getUserOauthAccessToken: mocks.tokens } })) }));
vi.mock("@/lib/prisma", () => {
  const tx = { $executeRaw: mocks.execute, scheduledContent: { findFirst: mocks.findFirst, updateMany: mocks.updateMany } };
  return { prisma: { ...tx, googleCalendarConnection: { findUnique: mocks.connection }, $transaction: vi.fn(async (callback) => callback(tx)) } };
});
import { googleToken, googleEventId, googleEventBody, syncGoogleSchedule } from "@/lib/calendar/google";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/calendar/constants";

const schedule = (status = "pending") => ({
  id: "schedule-a", userId: "user-a", status, platform: "x", scheduledAt: new Date("2026-10-07T05:00:00Z"),
  googleEventId: status === "cancelled" ? "existing-event" : null, googleCalendarId: null, googleExternalAccountId: null,
  content: { title: "Coffee launch", body: "Marketing copy" },
  user: { clerkUserId: "clerk-a", deletedAt: null, googleCalendar: { enabled: true, calendarId: "primary", externalAccountId: "google-a" } },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("Google Calendar integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(schedule());
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.tokens.mockResolvedValue({ data: [{ externalAccountId: "google-a", token: "private-test-token", scopes: [GOOGLE_CALENDAR_SCOPE] }] });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("retrieves OAuth credentials for the authenticated Clerk identity only", async () => {
    await googleToken("clerk-a", "google-a");
    expect(mocks.tokens).toHaveBeenCalledWith("clerk-a", "google");
    await expect(googleToken("clerk-a", "different-account")).rejects.toMatchObject({ code: "google_permission_required" });
  });
  it("requires calendar write consent instead of accepting ordinary Google sign-in", async () => {
    mocks.tokens.mockResolvedValue({ data: [{ externalAccountId: "google-a", token: "private-test-token", scopes: ["email", "profile"] }] });
    await expect(googleToken("clerk-a")).rejects.toMatchObject({ code: "google_permission_required" });
  });
  it("uses stable Google-compatible event IDs and preserves the scheduled instant", () => {
    expect(googleEventId("schedule-a")).toMatch(/^[a-v0-9]{64}$/);
    expect(googleEventId("schedule-a")).toBe(googleEventId("schedule-a"));
    expect(googleEventId("schedule-b")).not.toBe(googleEventId("schedule-a"));
    expect(googleEventBody(schedule())).toMatchObject({ start: { dateTime: "2026-10-07T05:00:00.000Z" }, end: { dateTime: "2026-10-07T05:15:00.000Z" } });
  });
  it("inserts a missing Google event and persists its identity and link", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({ htmlLink: "https://www.google.com/calendar/event?eid=test" }, 201));
    vi.stubGlobal("fetch", fetch);
    await expect(syncGoogleSchedule("user-a", "schedule-a")).resolves.toEqual({ status: "synced" });
    expect(fetch.mock.calls[1][1].method).toBe("POST");
    expect(JSON.parse(fetch.mock.calls[1][1].body).id).toBe(googleEventId("schedule-a"));
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "schedule-a", userId: "user-a" }, data: expect.objectContaining({ googleSyncError: null }) }));
  });
  it("recovers an insert conflict by updating the same event rather than duplicating it", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 409)).mockResolvedValueOnce(json({}));
    vi.stubGlobal("fetch", fetch);
    await expect(syncGoogleSchedule("user-a", "schedule-a")).resolves.toEqual({ status: "synced" });
    expect(fetch.mock.calls.map((call) => call[1].method)).toEqual(["PATCH", "POST", "PATCH"]);
  });
  it("updates an existing Google event on reschedule", async () => {
    mocks.findFirst.mockResolvedValue({ ...schedule(), googleEventId: "existing-event" });
    const fetch = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal("fetch", fetch);
    await syncGoogleSchedule("user-a", "schedule-a");
    expect(fetch.mock.calls[0][0]).toContain("/events/existing-event");
    expect(fetch.mock.calls[0][1].method).toBe("PATCH");
  });
  it("cancels external events idempotently even if Google has already removed them", async () => {
    mocks.findFirst.mockResolvedValue(schedule("cancelled"));
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 410 }));
    vi.stubGlobal("fetch", fetch);
    await expect(syncGoogleSchedule("user-a", "schedule-a")).resolves.toEqual({ status: "synced" });
    expect(fetch.mock.calls[0][1].method).toBe("DELETE");
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ googleEventId: null }) }));
  });
  it("keeps the app schedule and exposes a safe retry error when Google fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 401)));
    const result = await syncGoogleSchedule("user-a", "schedule-a");
    expect(result.status).toBe("error");
    expect(result.error).not.toContain("private-test-token");
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ googleSyncError: expect.any(String) }) }));
  });
  it("does not touch foreign schedules or request their Google credentials", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(syncGoogleSchedule("user-a", "foreign")).resolves.toEqual({ status: "skipped" });
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign", userId: "user-a" } }));
    expect(mocks.tokens).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
});
