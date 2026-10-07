"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type ContentItem, type CalendarSyncResult } from "@/lib/client";
import { ErrorBanner, Select, TextArea, TextInput } from "@/components/ui";
import { CONTENT_TYPE_LABELS } from "@/lib/constants";
import { useToast } from "@/components/ToastProvider";
import ScheduleDialog from "@/components/ScheduleDialog";
import RepurposeDialog from "@/components/RepurposeDialog";

export default function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { push } = useToast();
  const [item, setItem] = useState<ContentItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showRepurpose, setShowRepurpose] = useState(false);
  const reload = useCallback(async () => {
    const result = await api.get<{ content: ContentItem }>(`/api/content/${id}`);
    setItem(result.content); setStatus(result.content.status);
  }, [id]);

  useEffect(() => {
    api
      .get<{ content: ContentItem }>(`/api/content/${id}`)
      .then((d) => {
        setItem(d.content);
        setTitle(d.content.title);
        setBody(d.content.body);
        setStatus(d.content.status);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await api.patch<{ content: ContentItem; calendarSync: CalendarSyncResult[] }>(`/api/content/${id}`, { title, body, status });
      setItem(result.content);
      setDirty(false);
      push("success", "Saved.");
      const failed = result.calendarSync.find((sync) => sync.status === "error");
      if (failed) push("info", failed.error ?? "Saved. Google Calendar sync needs a retry.");
      return true;
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;

  if (error) return <ErrorBanner message={error} />;
  if (!item) return <div className="mx-auto max-w-3xl skeleton h-96" />;

  return (
    <div className="mx-auto max-w-3xl fade-up">
      <Link href="/library" className="text-[13px] text-ink2 underline underline-offset-2 hover:text-ink">
        ← Library
      </Link>

      {/* Metadata strip */}
      <div className="meta mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium uppercase tracking-[0.08em] text-ink2">
          {CONTENT_TYPE_LABELS[item.format] ?? item.format}
        </span>
        {item.brand && <span>· {item.brand.name}</span>}
        {item.sourceContentId && (
          <Link href={`/library/${item.sourceContentId}`} className="text-accent underline underline-offset-2">
            repurposed · view source
          </Link>
        )}
        {item.repurposed && item.repurposed.length > 0 && (
          <span>{item.repurposed.length} repurposed version{item.repurposed.length > 1 ? "s" : ""}</span>
        )}
        {item.keywords && item.keywords.length > 0 && <span>· {item.keywords.join(", ")}</span>}
      </div>

      {/* Editable title */}
      <TextInput
        disabled={saving}
        value={title}
        onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
        className="mt-3 !rounded-none !border-0 !bg-transparent !px-0 !text-[24px] !font-semibold !tracking-tight focus:!outline-none"
      />

      {/* Editorial canvas */}
      <TextArea
        disabled={saving}
        value={body}
        onChange={(e) => { setBody(e.target.value); setDirty(true); }}
        className="editorial-body mt-3 !min-h-[420px] resize-y !rounded-none !border-y !border-line !bg-surface !px-0 !py-5 font-editorial focus:!outline-none sm:!px-6"
      />

      {/* Inline action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
        <span className="meta">
          {wordCount} words
          {dirty && <span className="ml-2 text-warn">unsaved</span>}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Select
            disabled={saving}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setDirty(true); }}
            className="!w-auto !py-1 !text-[12.5px]"
            options={["draft", ...(item.schedules?.length ? ["scheduled"] : []), "published", "archived"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
          />
          <button onClick={save} disabled={!dirty || saving} className="text-[13px] font-medium text-accent disabled:opacity-40">
            {saving ? "Saving…" : dirty ? "Save" : "Saved"}
          </button>
          <button disabled={saving} onClick={async () => { if (!dirty || await save()) setShowSchedule(true); }} className="text-[13px] font-medium text-ink2 hover:text-accent disabled:opacity-40">
            {item.status === "scheduled" && item.schedules?.length ? "Reschedule" : "Schedule"}
          </button>
          <button disabled={saving} onClick={async () => { if (!dirty || await save()) setShowRepurpose(true); }} className="text-[13px] font-medium text-ink2 hover:text-accent disabled:opacity-40">Repurpose</button>
          <button onClick={() => { navigator.clipboard.writeText(body); push("success", "Copied to clipboard."); }} className="text-[13px] font-medium text-ink2 hover:text-accent">Copy</button>
        </div>
      </div>

      {showSchedule && (
        <ScheduleDialog
          contentId={item.id}
          contentTitle={title}
          defaultPlatform={item.schedules?.[0]?.platform ?? item.format}
          existingScheduleId={item.schedules?.[0]?.id}
          existingAt={item.schedules?.[0] ? new Date(item.schedules[0].scheduledAt).toISOString() : undefined}
          onClose={() => setShowSchedule(false)}
          onScheduled={() => { setShowSchedule(false); reload().catch((error: Error) => push("error", error.message)); }}
        />
      )}
      {showRepurpose && (
        <RepurposeDialog content={item} onClose={() => setShowRepurpose(false)} onDone={() => { setShowRepurpose(false); push("success", "Repurposed draft saved to library."); }} />
      )}
    </div>
  );
}
