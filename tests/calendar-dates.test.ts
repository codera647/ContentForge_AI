import { afterEach, describe, expect, it } from "vitest";
import { localDateInput, localTimeInput, scheduleIso } from "@/lib/calendar/dates";
const originalTimezone = process.env.TZ;
afterEach(() => { if (originalTimezone) process.env.TZ = originalTimezone; else delete process.env.TZ; });

describe("schedule timezone handling", () => {
  it("keeps Karachi's local date/time unchanged when reopening and saving an ISO schedule", () => {
    process.env.TZ = "Asia/Karachi";
    const instant = "2026-10-07T05:00:00.000Z";
    expect(localDateInput(instant)).toBe("2026-10-07");
    expect(localTimeInput(instant)).toBe("10:00");
    expect(scheduleIso(localDateInput(instant), localTimeInput(instant))).toBe(instant);
  });
  it("handles schedules crossing midnight UTC", () => {
    process.env.TZ = "Asia/Karachi";
    expect(localDateInput("2026-10-06T21:00:00Z")).toBe("2026-10-07");
  });
  it("rejects invalid and nonexistent daylight saving dates", () => {
    expect(() => scheduleIso("2026-02-31", "10:00")).toThrow();
    process.env.TZ = "America/New_York";
    expect(() => scheduleIso("2026-03-08", "02:30")).toThrow();
    expect(() => scheduleIso("", "")).toThrow();
  });
});
