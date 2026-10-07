import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const tx = vi.hoisted(() => ({
  content: { findFirst: vi.fn(), updateMany: vi.fn() },
  scheduledContent: { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(async (callback) => callback(tx)) } }));
import { createSchedule, updateSchedule, cancelSchedule } from "@/lib/scheduling";

describe("schedule orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.content.findFirst.mockResolvedValue({ id: "content-a", status: "draft" });
    tx.scheduledContent.findFirst.mockResolvedValue({ id: "schedule-a", contentId: "content-a", status: "pending" });
    tx.scheduledContent.count.mockResolvedValue(0);
  });
  it("creates a schedule and changes content status in one ownership-scoped transaction", async () => {
    const input = { contentId: "content-a", platform: "x" as const, scheduledAt: "2026-10-07T10:00:00Z" };
    await createSchedule("user-a", input);
    expect(tx.content.findFirst).toHaveBeenCalledWith({ where: { id: "content-a", userId: "user-a" } });
    expect(tx.scheduledContent.create).toHaveBeenCalledWith({ data: { userId: "user-a", contentId: "content-a", platform: "x", scheduledAt: new Date(input.scheduledAt) } });
    expect(tx.content.updateMany).toHaveBeenCalledWith({ where: { id: "content-a", userId: "user-a" }, data: { status: "scheduled" } });
  });
  it("cannot schedule someone else's content", async () => {
    tx.content.findFirst.mockResolvedValue(null);
    await expect(createSchedule("user-a", { contentId: "foreign", platform: "x", scheduledAt: "2026-10-07T10:00:00Z" })).rejects.toMatchObject({ status: 404 });
    expect(tx.scheduledContent.create).not.toHaveBeenCalled();
  });
  it("cannot schedule archived content while deletion is being coordinated", async () => {
    tx.content.findFirst.mockResolvedValue({ id: "content-a", status: "archived" });
    await expect(createSchedule("user-a", { contentId: "content-a", platform: "x", scheduledAt: "2026-10-07T10:00:00Z" })).rejects.toMatchObject({ code: "content_archived" });
  });
  it("rejects rescheduling cancelled schedules instead of creating a ghost event", async () => {
    tx.scheduledContent.findFirst.mockResolvedValue({ id: "schedule-a", status: "cancelled" });
    await expect(updateSchedule("user-a", "schedule-a", { platform: "x" })).rejects.toMatchObject({ code: "schedule_inactive" });
    expect(tx.scheduledContent.updateMany).not.toHaveBeenCalled();
  });
  it("keeps content scheduled when another pending schedule remains", async () => {
    tx.scheduledContent.count.mockResolvedValue(1);
    await cancelSchedule("user-a", "schedule-a");
    expect(tx.content.updateMany).not.toHaveBeenCalled();
  });
  it("returns content to draft only after its last pending schedule is cancelled", async () => {
    await cancelSchedule("user-a", "schedule-a");
    expect(tx.content.updateMany).toHaveBeenCalledWith({ where: { id: "content-a", userId: "user-a", status: "scheduled" }, data: { status: "draft" } });
  });
  it("blocks cancelling a foreign schedule", async () => {
    tx.scheduledContent.findFirst.mockResolvedValue(null);
    await expect(cancelSchedule("user-a", "foreign")).rejects.toMatchObject({ status: 404 });
    expect(tx.scheduledContent.updateMany).not.toHaveBeenCalled();
  });
});
