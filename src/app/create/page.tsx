"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, type Brand, type ContentItem, type Variation } from "@/lib/client";
import { Button, ErrorBanner, Field, Select, TagInput, TextArea, TextInput } from "@/components/ui";
import { CONTENT_TYPES, LENGTHS, LENGTH_GUIDANCE, OBJECTIVES, STRATEGY_LABELS, TONES } from "@/lib/constants";
import { useToast } from "@/components/ToastProvider";
import ScheduleDialog from "@/components/ScheduleDialog";

interface FormState {
  brandId: string;
  format: string;
  topic: string;
  audience: string;
  objective: string;
  tone: string;
  length: "short" | "medium" | "long";
  keywords: string[];
  cta: string;
  variations: 1 | 2 | 3;
}

const INITIAL: FormState = {
  brandId: "",
  format: "linkedin",
  topic: "",
  audience: "",
  objective: "engagement",
  tone: "",
  length: "medium",
  keywords: [],
  cta: "",
  variations: 2,
};

interface Result extends Variation {
  editedBody: string;
  savedId?: string;
  regenerating?: boolean;
}

function CreateInner() {
  const sp = useSearchParams();
  const { push } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [results, setResults] = useState<Result[] | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [scheduleFor, setScheduleFor] = useState<Result | null>(null);
  const set = <K extends keyof FormState,>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get<{ brands: Brand[] }>("/api/brands").then((d) => {
      setBrands(d.brands);
      const preset = sp.get("brandId");
      if (preset && d.brands.some((b) => b.id === preset)) set("brandId", preset);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedBrand = useMemo(() => brands.find((b) => b.id === form.brandId) ?? null, [brands, form.brandId]);
  const active = results?.[activeIdx] ?? null;
  const wordCount = active ? active.editedBody.trim().split(/\s+/).filter(Boolean).length : 0;

  const generate = async () => {
    setError(null);
    setFieldErrors({});
    if (form.topic.trim().length < 3) {
      setFieldErrors({ topic: "Topic must be at least 3 characters" });
      return;
    }
    setGenerating(true);
    setResults(null);
    try {
      const d = await api.post<{ variations: Variation[]; saved: ContentItem[] }>("/api/generate", {
        save: true,
        params: {
          brandId: form.brandId || null,
          format: form.format,
          topic: form.topic.trim(),
          audience: form.audience.trim() || undefined,
          objective: form.objective || undefined,
          tone: form.tone.trim() || selectedBrand?.tone || undefined,
          length: form.length,
          keywords: form.keywords,
          cta: form.cta.trim() || undefined,
          variations: form.variations,
        },
      });
      setResults(d.variations.map((v, i) => ({ ...v, editedBody: v.body, savedId: d.saved[i]?.id })));
      setActiveIdx(0);
      push("success", `${d.variations.length} variation${d.variations.length > 1 ? "s" : ""} drafted and saved to your library.`);
    } catch (e) {
      const fe = (e as { fieldErrors?: Record<string, string[]> }).fieldErrors;
      if (fe) setFieldErrors(Object.fromEntries(Object.entries(fe).map(([k, arr]) => [k, arr.join(", ")])));
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const regenerate = async (idx: number) => {
    if (!results) return;
    setResults((rs) => rs!.map((r, i) => (i === idx ? { ...r, regenerating: true } : r)));
    try {
      const d = await api.post<{ variations: Variation[]; saved: ContentItem[] }>("/api/generate", {
        save: true,
        params: {
          brandId: form.brandId || null,
          format: form.format,
          topic: form.topic.trim(),
          audience: form.audience.trim() || undefined,
          objective: form.objective || undefined,
          tone: form.tone.trim() || selectedBrand?.tone || undefined,
          length: form.length,
          keywords: form.keywords,
          cta: form.cta.trim() || undefined,
          variations: 1,
        },
      });
      const fresh = d.variations[0];
      setResults((rs) =>
        rs!.map((r, i) =>
          i === idx ? { ...fresh, editedBody: fresh.body, savedId: d.saved[0]?.id, regenerating: false } : r
        )
      );
      push("success", "Regenerated with a fresh angle.");
    } catch (e) {
      setResults((rs) => rs!.map((r, i) => (i === idx ? { ...r, regenerating: false } : r)));
      setError(e instanceof Error ? e.message : "Regeneration failed");
    }
  };

  const saveEdit = async (idx: number) => {
    const r = results?.[idx];
    if (!r?.savedId) return;
    try {
      await api.patch(`/api/content/${r.savedId}`, { body: r.editedBody });
      setResults((rs) => rs!.map((x, j) => (j === idx ? { ...x, body: x.editedBody } : x)));
      push("success", "Edits saved.");
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Save failed");
    }
  };

  const brief = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        generate();
      }}
      className="space-y-6"
    >
      <section className="space-y-4">
        <h2 className="eyebrow">Brief</h2>
        <Field label="Brand">
          <Select
            value={form.brandId}
            onChange={(e) => set("brandId", e.target.value)}
            options={[
              { value: "", label: "No brand — generic voice" },
              ...brands.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
        </Field>
        {selectedBrand && (
          <p className="-mt-2 text-xs leading-relaxed text-faint">
            {selectedBrand.tone ? `${selectedBrand.tone} tone` : "Voice active"}
            {selectedBrand.writingStyle ? ` · ${selectedBrand.writingStyle}` : ""}
            {" · "}
            <Link href={`/brands/${selectedBrand.id}/edit`} className="text-accent underline underline-offset-2">
              edit
            </Link>
          </p>
        )}
        <Field label="Format">
          <Select
            value={form.format}
            onChange={(e) => set("format", e.target.value)}
            options={CONTENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </Field>
        <Field label="Topic" required error={fieldErrors.topic}>
          <TextArea
            value={form.topic}
            onChange={(e) => set("topic", e.target.value)}
            className="!min-h-[64px]"
            placeholder="Launch of our new single-origin espresso blend"
          />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow">Direction</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Audience">
            <TextInput value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Home baristas" />
          </Field>
          <Field label="Objective">
            <Select value={form.objective} onChange={(e) => set("objective", e.target.value)} options={OBJECTIVES.map((o) => ({ value: o, label: o[0].toUpperCase() + o.slice(1) }))} />
          </Field>
          <Field label="Tone" hint={selectedBrand?.tone ? `Brand: ${selectedBrand.tone}` : undefined}>
            <TextInput list="create-tones" value={form.tone} onChange={(e) => set("tone", e.target.value)} placeholder={selectedBrand?.tone ?? "Optional"} />
            <datalist id="create-tones">{TONES.map((t) => <option key={t} value={t} />)}</datalist>
          </Field>
          <Field label="Length" hint={LENGTH_GUIDANCE[form.length]}>
            <Select value={form.length} onChange={(e) => set("length", e.target.value as FormState["length"])} options={LENGTHS.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) }))} />
          </Field>
        </div>
        <Field label="Keywords" hint="Enter to add · max 10">
          <TagInput value={form.keywords} onChange={(v) => set("keywords", v.slice(0, 10))} placeholder="espresso, limited roast" />
        </Field>
        <Field label="Call to action">
          <TextInput value={form.cta} onChange={(e) => set("cta", e.target.value)} placeholder="Shop the launch roast" />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Variations</h2>
        <div className="flex gap-4">
          {[1, 2, 3].map((n) => (
            <label key={n} className="flex cursor-pointer items-center gap-1.5 text-sm text-ink">
              <input
                type="radio"
                name="variations"
                checked={form.variations === n}
                onChange={() => set("variations", n as 1 | 2 | 3)}
                className="accent-[#c75b39]"
              />
              {n}
            </label>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-faint">
          Each variation takes a different approach — direct, story-driven or educational — so they never read as clones.
        </p>
      </section>

      <Button type="submit" loading={generating} className="w-full">
        {generating ? "Writing…" : "Write content"}
      </Button>
    </form>
  );

  return (
    <div className="mx-auto max-w-6xl fade-up">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Create</h1>
        <span className="meta">Brief on the left · copy on the right</span>
      </div>
      <div className="rule mt-4" />

      <div className="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(280px,34fr)_minmax(0,66fr)]">
        {/* LEFT — brief */}
        <div className="lg:sticky lg:top-7">{brief}</div>

        {/* RIGHT — writing canvas */}
        <div className="min-w-0">
          {error && <ErrorBanner message={error} onRetry={generate} />}

          {generating && (
            <div className="space-y-3 border border-line bg-surface p-8">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-7 w-2/3" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-3/5" />
            </div>
          )}

          {!generating && !results && (
            <div className="grid min-h-[420px] place-items-center border border-dashed border-linestrong bg-surface px-8 py-16 text-center">
              <div>
                <p className="font-editorial text-xl italic text-ink2">The page is blank.</p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-faint">
                  Fill the brief and press <span className="font-medium text-ink2">Write content</span>. Your copy appears
                  here, ready to edit, and every draft is saved to the library.
                </p>
              </div>
            </div>
          )}

          {results && !generating && (
            <div>
              {/* Variation switcher */}
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex gap-5" role="tablist">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      role="tab"
                      aria-selected={i === activeIdx}
                      onClick={() => setActiveIdx(i)}
                      className={`border-b-2 pb-1.5 text-[13px] font-medium ${
                        i === activeIdx ? "border-accent text-ink" : "border-transparent text-faint hover:text-ink2"
                      }`}
                    >
                      {STRATEGY_LABELS[r.strategy as keyof typeof STRATEGY_LABELS] ?? r.strategy}
                    </button>
                  ))}
                </div>
                <span className="meta hidden sm:block">{results.length} draft{results.length > 1 ? "s" : ""} saved</span>
              </div>
              <div className="rule mt-0" />

              {/* Paper canvas */}
              {active && (
                <article key={activeIdx} className="fade-up mt-6 border border-line bg-surface px-8 py-7 sm:px-10 sm:py-9">
                  <div className="meta flex flex-wrap gap-x-3 border-b border-line pb-3">
                    <span className="font-medium uppercase tracking-[0.08em] text-ink2">
                      {CONTENT_TYPES.find((t) => t.value === form.format)?.label ?? form.format}
                    </span>
                    {selectedBrand && <span>· {selectedBrand.name}</span>}
                  </div>

                  <p className="meta mt-5">{active.title}</p>
                  <TextArea
                    value={active.editedBody}
                    onChange={(e) =>
                      setResults((rs) => rs!.map((x, j) => (j === activeIdx ? { ...x, editedBody: e.target.value } : x)))
                    }
                    className="editorial-body !min-h-[340px] resize-y !rounded-none !border-0 !bg-transparent !px-0 font-editorial focus:!outline-none"
                  />

                  {/* Footer meta + inline actions */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="meta">
                      {wordCount} words
                      {active.editedBody !== active.body && <span className="ml-2 text-warn">unsaved edits</span>}
                    </span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <button onClick={() => saveEdit(activeIdx)} className="text-[13px] font-medium text-ink2 hover:text-accent">Save</button>
                      <button onClick={() => { navigator.clipboard.writeText(active.editedBody); push("success", "Copied to clipboard."); }} className="text-[13px] font-medium text-ink2 hover:text-accent">Copy</button>
                      <button onClick={() => regenerate(activeIdx)} disabled={active.regenerating} className="text-[13px] font-medium text-ink2 hover:text-accent disabled:opacity-50">
                        {active.regenerating ? "Writing…" : "Regenerate"}
                      </button>
                      <button onClick={() => setScheduleFor(active)} disabled={!active.savedId} className="text-[13px] font-medium text-accent disabled:opacity-50">Schedule</button>
                    </div>
                  </div>
                </article>
              )}
            </div>
          )}
        </div>
      </div>

      {scheduleFor?.savedId && (
        <ScheduleDialog
          contentId={scheduleFor.savedId}
          contentTitle={scheduleFor.title}
          defaultPlatform={form.format}
          onClose={() => setScheduleFor(null)}
          onScheduled={() => {
            setScheduleFor(null);
            push("success", "Scheduled — see it on your calendar.");
          }}
        />
      )}
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl skeleton h-96" />}>
      <CreateInner />
    </Suspense>
  );
}
