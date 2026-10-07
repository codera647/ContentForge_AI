import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { User } from "@prisma/client";

config({ quiet: true });
vi.mock("server-only", () => ({}));
const session = vi.hoisted(() => ({ user: null as User | null }));
vi.mock("@/lib/auth", () => ({ requireCurrentUser: async () => {
  if (!session.user) throw new Error("Integration session missing");
  return session.user;
} }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ users: {
  getUserOauthAccessToken: async () => ({ data: [{ externalAccountId: "integration-google", token: "test-token", scopes: ["https://www.googleapis.com/auth/calendar.events"] }] }),
} }) }));

import { prisma } from "@/lib/prisma";
import { syncClerkUser, type ClerkProfile } from "@/lib/user-sync";
import { createSchedule, updateSchedule, cancelSchedule } from "@/lib/scheduling";
import { googleEventId, syncGoogleSchedule } from "@/lib/calendar/google";
import { GET as listContent } from "@/app/api/content/route";
import { GET as listSchedule } from "@/app/api/schedule/route";
import { PATCH as editContent } from "@/app/api/content/[id]/route";

// Opt-in because this suite uses the configured database; all records belong to unique temporary identities.
describe.runIf(process.env.RUN_DB_INTEGRATION === "1")("real PostgreSQL workspace pipeline", () => {
  const runId = randomUUID();
  const clerkIds = [`integration-a-${runId}`, `integration-b-${runId}`];
  function profile(index: number, updatedAt: number): ClerkProfile {
    return { id: clerkIds[index], firstName: "Integration", lastName: String(index), username: null, imageUrl: "",
      primaryEmailAddressId: "email", emailAddresses: [{ id: "email", emailAddress: `${clerkIds[index]}@example.invalid`, verification: { status: "verified" } }], updatedAt };
  }
  afterAll(async () => {
    vi.unstubAllGlobals();
    await prisma.user.deleteMany({ where: { clerkUserId: { in: clerkIds } } });
    await prisma.$disconnect();
  });
  it("provisions once, isolates two users, and keeps content/schedules consistent", async () => {
    const timestamp = Date.now();
    const [first, concurrent, second] = await Promise.all([
      syncClerkUser(profile(0, timestamp)), syncClerkUser(profile(0, timestamp)), syncClerkUser(profile(1, timestamp)),
    ]);
    expect(first.id).toBe(concurrent.id);
    expect(await prisma.user.count({ where: { clerkUserId: clerkIds[0] } })).toBe(1);
    const changed = await syncClerkUser({ ...profile(0, timestamp + 1), firstName: "Updated" });
    expect(changed.name).toBe("Updated 0");
    expect((await syncClerkUser(profile(0, timestamp))).name).toBe("Updated 0");

    const content = await prisma.content.create({ data: { userId: first.id, title: "Integration content", body: "Saved copy", format: "linkedin" } });
    session.user = first;
    const schedules = await Promise.all([
      createSchedule(first.id, { contentId: content.id, platform: "linkedin", scheduledAt: "2026-10-08T14:30:00+05:00" }),
      createSchedule(first.id, { contentId: content.id, platform: "x", scheduledAt: "2026-10-08T10:00:00Z" }),
    ]);
    expect((await prisma.content.findUniqueOrThrow({ where: { id: content.id } })).status).toBe("scheduled");
    expect(schedules[0].scheduledAt.toISOString()).toBe("2026-10-08T09:30:00.000Z");
    const ownList = await listContent(new NextRequest("http://localhost/api/content"));
    expect((await ownList.json()).items).toHaveLength(1);

    session.user = second;
    expect((await (await listContent(new NextRequest("http://localhost/api/content"))).json()).items).toHaveLength(0);
    expect((await (await listSchedule(new NextRequest("http://localhost/api/schedule"))).json()).schedules).toHaveLength(0);
    await expect(createSchedule(second.id, { contentId: content.id, platform: "linkedin", scheduledAt: "2026-10-08T10:00:00Z" })).rejects.toMatchObject({ status: 404 });
    expect((await editContent(new NextRequest(`http://localhost/api/content/${content.id}`, { method: "PATCH", body: JSON.stringify({ body: "Foreign edit" }) }), { params: Promise.resolve({ id: content.id }) })).status).toBe(404);

    await cancelSchedule(first.id, schedules[0].id);
    expect((await prisma.content.findUniqueOrThrow({ where: { id: content.id } })).status).toBe("scheduled");
    await cancelSchedule(first.id, schedules[1].id);
    expect((await prisma.content.findUniqueOrThrow({ where: { id: content.id } })).status).toBe("draft");
    session.user = first;
    expect((await (await listSchedule(new NextRequest("http://localhost/api/schedule"))).json()).schedules).toHaveLength(0);

    // Use real database transactions and locks, with only the external OAuth/API responses simulated.
    await prisma.googleCalendarConnection.create({ data: { userId: first.id, externalAccountId: "integration-google" } });
    const googleSchedule = await createSchedule(first.id, { contentId: content.id, platform: "linkedin", scheduledAt: "2026-10-08T10:00:00Z" });
    const googleFetch = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ htmlLink: "https://www.google.com/calendar/event?eid=integration" }), { status: 201 }));
    vi.stubGlobal("fetch", googleFetch);
    expect(await syncGoogleSchedule(first.id, googleSchedule.id)).toEqual({ status: "synced" });
    const linked = await prisma.scheduledContent.findUniqueOrThrow({ where: { id: googleSchedule.id } });
    expect(linked.googleEventId).toBe(googleEventId(googleSchedule.id));
    expect(linked.googleExternalAccountId).toBe("integration-google");
    expect(linked.googleSyncError).toBeNull();
    await updateSchedule(first.id, linked.id, { scheduledAt: "2026-10-08T11:00:00Z" });
    googleFetch.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    expect(await syncGoogleSchedule(first.id, linked.id)).toEqual({ status: "synced" });
    expect(JSON.parse(googleFetch.mock.calls[2][1].body).start.dateTime).toBe("2026-10-08T11:00:00.000Z");
    await cancelSchedule(first.id, linked.id);
    googleFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await syncGoogleSchedule(first.id, linked.id)).toEqual({ status: "synced" });
    expect((await prisma.scheduledContent.findUniqueOrThrow({ where: { id: linked.id } })).googleEventId).toBeNull();
  }, 120_000);
});
