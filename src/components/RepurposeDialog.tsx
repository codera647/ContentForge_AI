"use client";

import { useState } from "react";
import { api, type ContentItem } from "@/lib/client";
import { Button, ErrorBanner, Select } from "@/components/ui";
import { CONTENT_TYPES } from "@/lib/constants";

export default function RepurposeDialog({
  content,
  onClose,
  onDone,
}: {
  content: ContentItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const options = CONTENT_TYPES.filter((t) => t.value !== content.format);
  const [target, setTarget] = useState<string>(options[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContentItem | null>(null);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      const d = await api.post<{ repurposed: ContentItem }>("/api/repurpose", {
        contentId: content.id,
        targetFormat: target,
      });
      setResult(d.repurposed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Repurposing failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-[10px] border border-line bg-surface p-6 shadow-[var(--shadow-overlay)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold tracking-tight">Repurpose</h2>
        <p className="mb-5 mt-1 truncate text-sm text-faint">{content.title}</p>
        {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

        {!result ? (
          <>
            <div className="mb-4 max-w-xs">
              <Select value={target} onChange={(e) => setTarget(e.target.value)} options={options.map((t) => ({ value: t.value, label: t.label }))} />
            </div>
            <p className="mb-5 max-w-lg text-sm leading-relaxed text-ink2">
              The AI restructures this piece for the new format — new hook and rhythm, same message and
              {content.brand?.name ? (
                <> the <span className="font-medium text-ink">{content.brand.name}</span> voice</>
              ) : (
                " a clear generic voice (no brand linked)"
              )}
              . The result is saved as a new draft.
            </p>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="tertiary" onClick={onClose}>Cancel</Button>
              <Button onClick={run} loading={busy}>Repurpose</Button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="eyebrow mb-2">Original</p>
                <div className="max-h-72 overflow-y-auto whitespace-pre-wrap border border-line bg-canvas p-4 text-[13.5px] leading-relaxed text-ink2">
                  {content.body}
                </div>
              </div>
              <div>
                <p className="eyebrow mb-2 text-accent">Repurposed — saved as draft</p>
                <div className="max-h-72 overflow-y-auto whitespace-pre-wrap border border-line bg-surface p-4 font-editorial text-[15px] leading-relaxed text-ink">
                  {result.body}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="secondary" onClick={run} loading={busy}>Try another format</Button>
              <Button onClick={onDone}>Done</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
