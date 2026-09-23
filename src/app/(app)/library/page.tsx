"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, type Brand, type ContentItem } from "@/lib/client";
import { Button, EmptyState, ErrorBanner, StatusBadge, TextInput, Select } from "@/components/ui";
import { CONTENT_TYPES, CONTENT_TYPE_LABELS } from "@/lib/constants";
import { useToast } from "@/components/ToastProvider";
import ScheduleDialog from "@/components/ScheduleDialog";
import RepurposeDialog from "@/components/RepurposeDialog";

function LibraryInner() {
  const sp = useSearchParams();
  const { push } = useToast();
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState(sp.get("status") ?? "");
  const [format, setFormat] = useState("");
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<ContentItem | null>(null);
  const [repurposeFor, setRepurposeFor] = useState<ContentItem | null>(null);

  const load = useCallback(
    (search = q, st = status, fmt = format, br = brandId) => {
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (st) params.set("status", st);
      if (fmt) params.set("format", fmt);
      if (br) params.set("brandId", br);
      api
        .get<{ items: ContentItem[]; total: number }>(`/api/content?${params.toString()}`)
        .then((d) => {
          setItems(d.items);
          setTotal(d.total);
        })
        .catch((e) => setError(e.message));
    },
    [q, status, format, brandId]
  );

  useEffect(() => {
    const t = setTimeout(() => load(q, status, format, brandId), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, format, brandId]);

  useEffect(() => {
    api.get<{ brands: Brand[] }>("/api/brands").then((d) => setBrands(d.brands)).catch(() => {});
  }, []);

  const remove = async (item: ContentItem) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      await api.del(`/api/content/${item.id}`);
      setItems((xs) => xs!.filter((x) => x.id !== item.id));
      setTotal((t) => t - 1);
      push("success", "Deleted.");
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (item: ContentItem) => {
    setBusyId(item.id);
    try {
      await api.post(`/api/content/${item.id}`, {});
      push("success", "Duplicated as a new draft.");
      load();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setBusyId(null);
    }
  };

  const unschedule = async (item: ContentItem) => {
    await api.del(`/api/schedule/${item.schedules![0].id}`);
    push("success", "Unscheduled — back to draft.");
    load();
  };

  const hasActiveFilters = q || status || format || brandId;

  return (
    <div className="mx-auto max-w-6xl fade-up">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Library</h1>
        <Link href="/create" className="text-sm font-medium text-accent underline underline-offset-2">
          New content →
        </Link>
      </div>

      {/* Filters row */}
      <div className="mt-5 grid gap-2 border-y border-line py-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput placeholder="Search title, body, topic…" value={q} onChange={(e) => setQ(e.target.value)} className="!py-1.5 !text-[13px]" />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="!py-1.5 !text-[13px]"
          options={[
            { value: "", label: "All statuses" },
            ...["draft", "scheduled", "published", "archived"].map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })),
          ]}
        />
        <Select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="!py-1.5 !text-[13px]"
          options={[{ value: "", label: "All formats" }, ...CONTENT_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
        />
        <Select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="!py-1.5 !text-[13px]"
          options={[{ value: "", label: "All brands" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
        />
      </div>
      <p className="meta mt-2">{total} item{total === 1 ? "" : "s"}</p>

      {error && <div className="mt-3"><ErrorBanner message={error} onRetry={() => load()} /></div>}

      {!items && !error && (
        <div className="mt-4 space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12" />)}
        </div>
      )}

      {items?.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title={hasActiveFilters ? "No matches" : "Your library is empty"}
            description={hasActiveFilters ? "Try adjusting your search or filters." : "Generated content is saved here automatically."}
            action={!hasActiveFilters ? <Link href="/create"><Button>Create content</Button></Link> : undefined}
          />
        </div>
      )}

      {items && items.length > 0 && (
        <table className="mt-4 w-full border-t border-line text-left text-sm">
          <thead>
            <tr className="meta border-b border-line">
              <th className="py-2 pr-3 font-medium">Title</th>
              <th className="hidden py-2 pr-3 font-medium md:table-cell">Format</th>
              <th className="hidden py-2 pr-3 font-medium lg:table-cell">Brand</th>
              <th className="hidden py-2 pr-3 font-medium md:table-cell">Updated</th>
              <th className="py-2 pr-3 text-right font-medium">Status</th>
              <th className="py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => (
              <tr key={item.id} className="align-top hover:bg-surface2">
                <td className="max-w-0 py-2.5 pr-3">
                  <Link href={`/library/${item.id}`} className="block truncate font-medium text-ink hover:text-accent">
                    {item.title}
                  </Link>
                  <span className="meta block truncate md:hidden">
                    {CONTENT_TYPE_LABELS[item.format] ?? item.format}
                    {item.brand ? ` · ${item.brand.name}` : ""}
                  </span>
                  {item.sourceContentId && <span className="meta">repurposed</span>}
                  {item.status === "scheduled" && item.schedules?.length ? (
                    <span className="meta block text-accent">
                      {new Date(item.schedules[0].scheduledAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : null}
                </td>
                <td className="hidden whitespace-nowrap py-2.5 pr-3 text-xs text-ink2 md:table-cell">
                  {CONTENT_TYPE_LABELS[item.format] ?? item.format}
                </td>
                <td className="hidden whitespace-nowrap py-2.5 pr-3 text-xs text-faint lg:table-cell">
                  {item.brand?.name ?? "—"}
                </td>
                <td className="hidden whitespace-nowrap py-2.5 pr-3 text-xs text-faint md:table-cell">
                  {new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-right">
                  <StatusBadge status={item.status} />
                </td>
                <td className="py-2.5">
                  <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[12.5px] font-medium">
                    <Link href={`/library/${item.id}`} className="text-ink2 hover:text-accent">Edit</Link>
                    <button onClick={() => { navigator.clipboard.writeText(item.body); push("success", "Copied."); }} className="text-ink2 hover:text-accent">Copy</button>
                    <button
                      onClick={() => duplicate(item)}
                      disabled={busyId === item.id}
                      className="text-ink2 hover:text-accent disabled:opacity-50"
                    >
                      Duplicate
                    </button>
                    <button onClick={() => setRepurposeFor(item)} className="text-ink2 hover:text-accent">Repurpose</button>
                    <button onClick={() => setScheduleFor(item)} className="text-accent">
                      {item.status === "scheduled" && item.schedules?.length ? "Reschedule" : "Schedule"}
                    </button>
                    {item.status === "scheduled" && item.schedules?.length ? (
                      <button onClick={() => unschedule(item)} className="text-warn">Unschedule</button>
                    ) : null}
                    <button
                      onClick={() => remove(item)}
                      disabled={busyId === item.id}
                      className="text-danger hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {scheduleFor && (
        <ScheduleDialog
          contentId={scheduleFor.id}
          contentTitle={scheduleFor.title}
          defaultPlatform={scheduleFor.format}
          existingScheduleId={scheduleFor.schedules?.[0]?.id}
          existingAt={scheduleFor.schedules?.[0] ? new Date(scheduleFor.schedules[0].scheduledAt).toISOString() : undefined}
          onClose={() => setScheduleFor(null)}
          onScheduled={() => { setScheduleFor(null); load(); }}
        />
      )}
      {repurposeFor && (
        <RepurposeDialog
          content={repurposeFor}
          onClose={() => setRepurposeFor(null)}
          onDone={() => { setRepurposeFor(null); push("success", "Repurposed — saved as a new draft."); load(); }}
        />
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl skeleton h-96" />}>
      <LibraryInner />
    </Suspense>
  );
}
