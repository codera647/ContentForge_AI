"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type ContentItem } from "@/lib/client";
import { CONTENT_TYPE_LABELS } from "@/lib/constants";
import { Button, ErrorBanner, TextInput } from "@/components/ui";
import ScheduleDialog from "@/components/ScheduleDialog";

export default function CalendarScheduleDialog({ date, onClose, onScheduled }: { date: string; onClose: () => void; onScheduled: () => void }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api.get<{ items: ContentItem[] }>(`/api/content?q=${encodeURIComponent(query)}&pageSize=20`).then((result) => {
        if (!cancelled) { setItems(result.items); setError(null); }
      }).catch((error: Error) => { if (!cancelled) setError(error.message); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  if (selected) return <ScheduleDialog contentId={selected.id} contentTitle={selected.title} defaultPlatform={selected.format} initialDate={date} onClose={onClose} onScheduled={onScheduled} />;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Choose content to schedule" className="w-full max-w-lg rounded-[10px] border border-line bg-surface p-6" onClick={(event) => event.stopPropagation()}>
        <h2 className="text-lg font-semibold">Schedule content</h2>
        <p className="mt-1 text-sm text-ink2">Choose a saved piece for {date}.</p>
        <TextInput className="mt-4" autoFocus placeholder="Search your content…" value={query} onChange={(event) => setQuery(event.target.value)} />
        {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
        {!items && !error && <div className="skeleton mt-4 h-32" />}
        <ul className="mt-4 max-h-72 overflow-y-auto divide-y divide-line">
          {items?.map((item) => <li key={item.id}><button disabled={item.status === "archived"} className="w-full py-3 text-left hover:text-accent disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setSelected(item)}>
            <span className="block text-sm font-medium">{item.title}</span><span className="meta">{CONTENT_TYPE_LABELS[item.format]} · {item.status === "archived" ? "Archived: restore to Draft first" : item.brand?.name ?? "No brand"}</span>
          </button></li>)}
        </ul>
        {items?.length === 0 && <p className="my-4 text-sm text-ink2">{query ? "No matching content. Try another search." : <>Your library is empty. <Link className="text-accent underline" href="/create">Create your first piece.</Link></>}</p>}
        <div className="mt-4 flex justify-end"><Button variant="tertiary" onClick={onClose}>Cancel</Button></div>
      </div>
    </div>
  );
}
