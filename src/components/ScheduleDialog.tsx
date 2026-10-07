"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Field, Select, TextInput } from "@/components/ui";
import { CONTENT_TYPES } from "@/lib/constants";
import { useToast } from "@/components/ToastProvider";
import { localDateInput, localTimeInput, scheduleIso } from "@/lib/calendar/dates";
import type { CalendarSyncResult } from "@/lib/client";

export default function ScheduleDialog({
  contentId,
  contentTitle,
  defaultPlatform,
  existingScheduleId,
  existingAt,
  initialDate,
  onClose,
  onScheduled,
}: {
  contentId: string;
  contentTitle: string;
  defaultPlatform?: string;
  existingScheduleId?: string;
  existingAt?: string;
  initialDate?: string;
  onClose: () => void;
  onScheduled?: () => void;
}) {
  const { push } = useToast();
  const [date, setDate] = useState(() => existingAt ? localDateInput(existingAt) : initialDate ?? localDateInput(new Date()));
  const [time, setTime] = useState(() => existingAt ? localTimeInput(existingAt) : "10:00");
  const [platform, setPlatform] = useState<string>(defaultPlatform ?? "linkedin");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedAt] = useState(() => Date.now());
  const isPast = new Date(`${date}T${time}`).getTime() < openedAt;

  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const scheduledAt = scheduleIso(date, time);
      let result: { calendarSync: CalendarSyncResult };
      if (existingScheduleId) {
        result = await api.patch(`/api/schedule/${existingScheduleId}`, { scheduledAt, platform });
      } else {
        result = await api.post("/api/schedule", { contentId, platform, scheduledAt });
      }
      push("success", existingScheduleId ? "Schedule updated." : `Scheduled for ${date} at ${time}.`);
      if (result.calendarSync.status === "error") push("info", result.calendarSync.error ?? "Saved. Google Calendar sync needs a retry.");
      onScheduled?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scheduling failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4" onClick={() => { if (!saving) onClose(); }}>
      <div
        className="w-full max-w-md rounded-[10px] border border-line bg-surface p-6 shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="Schedule content"
      >
        <h2 className="text-lg font-semibold tracking-tight">Schedule</h2>
        <p className="mb-5 mt-1 truncate text-sm text-faint">{contentTitle}</p>
        <p className="mb-4 text-xs text-ink2">Times use your device timezone. Connected Google calendars sync automatically.</p>
        {error && <p className="mb-4 border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Time">
              <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          {isPast && (
            <p className="border border-warn/30 bg-warn/5 px-3 py-2 text-xs text-warn">
              This is in the past — it will be flagged on the calendar.
            </p>
          )}
          <Field label="Platform">
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              options={CONTENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="tertiary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!date || !time}>
            {existingScheduleId ? "Update" : "Schedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
