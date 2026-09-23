"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, type ScheduleItem } from "@/lib/client";
import { Button, ErrorBanner } from "@/components/ui";
import { CONTENT_TYPE_LABELS } from "@/lib/constants";
import ScheduleDialog from "@/components/ScheduleDialog";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [schedules, setSchedules] = useState<ScheduleItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScheduleItem | null>(null);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);

  const range = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    return { from, to };
  }, [cursor]);

  const load = () => {
    setError(null);
    api
      .get<{ schedules: ScheduleItem[] }>(
        `/api/schedule?from=${range.from.toISOString()}&to=${range.to.toISOString()}`
      )
      .then((d) => setSchedules(d.schedules))
      .catch((e) => setError(e.message));
  };
  useEffect(load, [range]);

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - offset + i);
      cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() });
    }
    return cells;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const s of schedules ?? []) {
      const key = new Date(s.scheduledAt).toDateString();
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return map;
  }, [schedules]);

  const todayStr = new Date().toDateString();

  const unschedule = async (s: ScheduleItem) => {
    if (!confirm(`Unschedule "${s.content.title}"? It goes back to Draft.`)) return;
    try {
      await api.del(`/api/schedule/${s.id}`);
      setSelected(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to unschedule");
    }
  };

  return (
    <div className="mx-auto max-w-6xl fade-up">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Calendar</h1>
          <p className="mt-0.5 text-sm text-ink2">
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })} · {schedules?.length ?? 0} scheduled
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="tertiary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>←</Button>
            <Button variant="tertiary" onClick={() => setCursor(startOfMonth(new Date()))}>Today</Button>
            <Button variant="tertiary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>→</Button>
          </div>
          <Link href="/create" className="text-sm font-medium text-accent underline underline-offset-2">
            New content →
          </Link>
        </div>
      </div>

      {error && <div className="mt-4"><ErrorBanner message={error} onRetry={load} /></div>}
      {!schedules && !error && (
        <div className="mt-6 grid grid-cols-7 gap-0">
          {[...Array(35)].map((_, i) => <div key={i} className="skeleton h-24 border border-canvas" />)}
        </div>
      )}

      {schedules && (
        <div className={`mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_${selected ? "300px" : "0px"}]`}>
          {/* Grid */}
          <div className="min-w-0">
            <div className="grid grid-cols-7 border-b border-line">
              {DAYS.map((d) => (
                <div key={d} className="eyebrow py-2 text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map(({ date, inMonth }, i) => {
                const items = byDay.get(date.toDateString()) ?? [];
                const isToday = date.toDateString() === todayStr;
                return (
                  <div
                    key={i}
                    className={`min-h-[92px] border-b border-r border-line p-1.5 [&:nth-child(7n)]:border-r-0 ${
                      inMonth ? "bg-surface" : "bg-canvas"
                    }`}
                  >
                    <div className={`mb-1 text-right text-[11px] tabular-nums ${isToday ? "font-semibold text-accent" : "text-faint"}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {items.map((s) => {
                        const overdue = new Date(s.scheduledAt) < new Date() && s.status === "pending";
                        return (
                          <button
                            key={s.id}
                            onClick={() => setSelected(s)}
                            className={`block w-full border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-snug ${
                              overdue
                                ? "border-warn text-warn hover:bg-warn/5"
                                : "border-accent text-ink hover:bg-accentsubtle/50"
                            }`}
                            title={`${fmtTime(s.scheduledAt)} · ${s.content.title}`}
                          >
                            <span className="block tabular-nums text-faint">{fmtTime(s.scheduledAt)}</span>
                            <span className="block truncate font-medium">{s.content.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {schedules.length === 0 && (
              <p className="mt-5 border-l-2 border-line pl-4 text-sm text-faint">
                Nothing scheduled this month. Schedule content from the library or after generating.
              </p>
            )}
          </div>

          {/* Side detail panel */}
          {selected && (
            <aside className="fade-up lg:sticky lg:top-7 lg:h-fit lg:border-l lg:border-line lg:pl-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="meta">
                    {new Date(selected.scheduledAt).toLocaleString(undefined, {
                      weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  <h2 className="mt-1 text-base font-semibold leading-snug tracking-tight">{selected.content.title}</h2>
                  <p className="meta mt-0.5">
                    {CONTENT_TYPE_LABELS[selected.platform] ?? selected.platform}
                    {selected.content.brand ? ` · ${selected.content.brand.name}` : ""}
                  </p>
                </div>
                <button onClick={() => setSelected(null)} className="text-faint hover:text-ink lg:hidden">×</button>
              </div>
              <div className="mt-4 max-h-72 overflow-y-auto whitespace-pre-wrap border-l-2 border-accent/40 pl-4 font-editorial text-[14.5px] leading-relaxed text-ink2">
                {selected.content.body}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3">
                <button onClick={() => { setEditing(selected); setSelected(null); }} className="text-[13px] font-medium text-ink2 hover:text-accent">Edit schedule</button>
                <button onClick={() => unschedule(selected)} className="text-[13px] font-medium text-danger hover:underline">Unschedule</button>
                <Link href={`/library/${selected.content.id}`} className="text-[13px] font-medium text-accent underline underline-offset-2">Open content</Link>
              </div>
            </aside>
          )}
        </div>
      )}

      {editing && (
        <ScheduleDialog
          contentId={editing.content.id}
          contentTitle={editing.content.title}
          defaultPlatform={editing.platform}
          existingScheduleId={editing.id}
          existingAt={new Date(editing.scheduledAt).toISOString()}
          onClose={() => setEditing(null)}
          onScheduled={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
