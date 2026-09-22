"use client";

import { useState } from "react";
import Link from "next/link";
import { api, type Brand } from "@/lib/client";
import { Button, Field, ErrorBanner, TagInput, TextArea, TextInput } from "@/components/ui";
import { TONES } from "@/lib/constants";

export interface BrandFormValues {
  name: string;
  description: string;
  industry: string;
  targetAudience: string;
  personality: string;
  tone: string;
  writingStyle: string;
  exampleContent: string;
  values: string[];
  preferredPhrases: string[];
  avoidedPhrases: string[];
}

const EMPTY: BrandFormValues = {
  name: "",
  description: "",
  industry: "",
  targetAudience: "",
  personality: "",
  tone: "",
  writingStyle: "",
  exampleContent: "",
  values: [],
  preferredPhrases: [],
  avoidedPhrases: [],
};

function toForm(b: Brand): BrandFormValues {
  return {
    name: b.name,
    description: b.description ?? "",
    industry: b.industry ?? "",
    targetAudience: b.targetAudience ?? "",
    personality: b.personality ?? "",
    tone: b.tone ?? "",
    writingStyle: b.writingStyle ?? "",
    exampleContent: b.exampleContent ?? "",
    values: b.values ?? [],
    preferredPhrases: b.preferredPhrases ?? [],
    avoidedPhrases: b.avoidedPhrases ?? [],
  };
}

function toPayload(v: BrandFormValues) {
  const clean = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    name: v.name.trim(),
    description: clean(v.description),
    industry: clean(v.industry),
    targetAudience: clean(v.targetAudience),
    personality: clean(v.personality),
    tone: clean(v.tone),
    writingStyle: clean(v.writingStyle),
    exampleContent: clean(v.exampleContent),
    values: v.values,
    preferredPhrases: v.preferredPhrases,
    avoidedPhrases: v.avoidedPhrases,
  };
}

export default function BrandForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Brand;
  onSubmit: (values: ReturnType<typeof toPayload>) => Promise<void>;
  submitLabel: string;
}) {
  const [v, setV] = useState<BrandFormValues>(initial ? toForm(initial) : EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof BrandFormValues, val: unknown) =>
    setV((old) => ({ ...old, [k]: val } as BrandFormValues));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setApiError(null);
    if (!v.name.trim()) {
      setErrors({ name: "Brand name is required" });
      return;
    }
    setSaving(true);
    try {
      await onSubmit(toPayload(v));
    } catch (err) {
      const fe = (err as { fieldErrors?: Record<string, string[]> }).fieldErrors;
      if (fe) setErrors(Object.fromEntries(Object.entries(fe).map(([k, arr]) => [k, arr.join(", ")])));
      else setApiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-8">
      {apiError && <ErrorBanner message={apiError} />}

      <section className="space-y-4">
        <h2 className="eyebrow border-b border-line pb-2">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" required error={errors.name}>
            <TextInput value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Coffee Co." />
          </Field>
          <Field label="Industry" error={errors.industry}>
            <TextInput value={v.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Specialty coffee / DTC" />
          </Field>
        </div>
        <Field label="Description" error={errors.description} hint="What the brand does, who runs it, what makes it different.">
          <TextArea value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="A small-batch roastery shipping single-origin coffee nationwide…" />
        </Field>
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow border-b border-line pb-2">Voice</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target audience" error={errors.targetAudience}>
            <TextInput value={v.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} placeholder="Home baristas, 25–40" />
          </Field>
          <Field label="Personality" error={errors.personality}>
            <TextInput value={v.personality} onChange={(e) => set("personality", e.target.value)} placeholder="Warm, nerdy about coffee, a little cheeky" />
          </Field>
          <Field label="Tone" error={errors.tone} hint="Default tone — can be overridden per generation.">
            <TextInput list="tone-options" value={v.tone} onChange={(e) => set("tone", e.target.value)} placeholder="casual" />
            <datalist id="tone-options">
              {TONES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <Field label="Writing style" error={errors.writingStyle}>
            <TextInput value={v.writingStyle} onChange={(e) => set("writingStyle", e.target.value)} placeholder="Short sentences, active voice, light humor" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Brand values" error={errors.values} hint="Enter to add">
            <TagInput value={v.values} onChange={(x) => set("values", x)} placeholder="sustainability" />
          </Field>
          <Field label="Preferred phrases" error={errors.preferredPhrases} hint="Woven in naturally">
            <TagInput value={v.preferredPhrases} onChange={(x) => set("preferredPhrases", x)} placeholder="brewed with intention" />
          </Field>
          <Field label="Phrases to avoid" error={errors.avoidedPhrases} hint="Never used by the AI">
            <TagInput value={v.avoidedPhrases} onChange={(x) => set("avoidedPhrases", x)} placeholder="game-changer" />
          </Field>
        </div>
        <Field
          label="Example content"
          error={errors.exampleContent}
          hint="Paste a real snippet of the brand's writing — the AI matches its rhythm and diction."
        >
          <TextArea value={v.exampleContent} onChange={(e) => set("exampleContent", e.target.value)} className="min-h-[110px] font-editorial !text-[15px]" placeholder="Life's too short for stale beans. We roast on Monday, ship on Tuesday…" />
        </Field>
      </section>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <Button type="submit" loading={saving}>{submitLabel}</Button>
        <Link href="/brands">
          <Button type="button" variant="tertiary">Cancel</Button>
        </Link>
      </div>
    </form>
  );
}
