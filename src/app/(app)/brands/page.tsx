"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type Brand } from "@/lib/client";
import { Button, ErrorBanner } from "@/components/ui";

function BrandList({
  brands,
  activeId,
  onSelect,
}: {
  brands: Brand[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <Link
        href="/brands/new"
        className="mb-4 inline-block text-sm font-medium text-accent underline underline-offset-2"
      >
        + New brand
      </Link>
      <ul className="border-t border-line">
        {brands.map((b) => (
          <li key={b.id}>
            <a
              href={`/brands?id=${b.id}`}
              onClick={(e) => {
                e.preventDefault();
                onSelect(b.id);
              }}
              className={`-mx-3 block border-l-2 px-3 py-2.5 ${
                b.id === activeId
                  ? "border-accent bg-surface2"
                  : "border-transparent hover:border-linestrong hover:bg-surface2/60"
              }`}
            >
              <span className={`block text-sm font-medium ${b.id === activeId ? "text-accent" : "text-ink"}`}>
                {b.name}
              </span>
              {b.industry && <span className="meta">{b.industry}</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BrandDetail({ brand, onDeleted }: { brand: Brand; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const list = (v: string[] | null | undefined) => (v?.length ? v : []);

  const remove = async () => {
    if (!confirm(`Delete brand "${brand.name}"? Its content will be kept but unlinked.`)) return;
    setDeleting(true);
    try {
      await api.del(`/api/brands/${brand.id}`);
      onDeleted();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const voiceFacts = [
    brand.personality && { label: "Personality", value: brand.personality },
    brand.tone && { label: "Tone", value: `${brand.tone} tone` },
    brand.writingStyle && { label: "Style", value: brand.writingStyle },
    brand.targetAudience && { label: "Audience", value: brand.targetAudience },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article className="fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{brand.name}</h2>
          {brand.industry && <p className="mt-0.5 text-sm text-ink2">{brand.industry}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/create?brandId=${brand.id}`}>
            <Button variant="secondary">Write with this brand</Button>
          </Link>
          <Link href={`/brands/${brand.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button variant="danger" loading={deleting} onClick={remove}>Delete</Button>
        </div>
      </div>

      {brand.description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink2">{brand.description}</p>}

      {voiceFacts.length > 0 && (
        <dl className="mt-6 grid gap-x-10 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
          {voiceFacts.map((f) => (
            <div key={f.label}>
              <dt className="eyebrow">{f.label}</dt>
              <dd className="mt-1 text-sm text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {list(brand.values).length > 0 && (
        <section className="mt-8">
          <h3 className="eyebrow">Values</h3>
          <ol className="mt-2 divide-y divide-line border-y border-line">
            {list(brand.values).map((v, i) => (
              <li key={v} className="flex gap-4 py-2 text-sm text-ink">
                <span className="meta w-6 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                {v}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-8 grid gap-10 sm:grid-cols-2">
        <section>
          <h3 className="eyebrow">Preferred language</h3>
          {list(brand.preferredPhrases).length ? (
            <ul className="mt-2 space-y-1">
              {list(brand.preferredPhrases).map((p) => (
                <li key={p} className="text-sm text-ink">“{p}”</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-faint">None set.</p>
          )}
        </section>
        <section>
          <h3 className="eyebrow text-danger/80">Avoid</h3>
          {list(brand.avoidedPhrases).length ? (
            <ul className="mt-2 space-y-1">
              {list(brand.avoidedPhrases).map((p) => (
                <li key={p} className="text-sm text-danger line-through decoration-danger/40">“{p}”</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-faint">None set.</p>
          )}
        </section>
      </div>

      {brand.exampleContent && (
        <section className="mt-8">
          <h3 className="eyebrow">Voice sample</h3>
          <blockquote className="mt-3 border-l-2 border-accent/50 pl-4 font-editorial text-[16px] leading-relaxed text-ink">
            {brand.exampleContent}
          </blockquote>
        </section>
      )}
    </article>
  );
}

function BrandsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeId = sp.get("id") ?? undefined;

  const select = useCallback(
    (id: string) => {
      router.push(`/brands?id=${id}`, { scroll: false });
    },
    [router]
  );

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ brands: Brand[] }>("/api/brands");
      setError(null);
      setBrands(data.brands);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load brands");
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ brands: Brand[] }>("/api/brands")
      .then((data) => {
        if (!cancelled) setBrands(data.brands);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load brands");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = brands?.find((b) => b.id === activeId) ?? null;

  return (
    <div className="mx-auto max-w-5xl fade-up">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Brand Voice</h1>
        <span className="meta">{brands?.length ?? 0} style guide{(brands?.length ?? 0) === 1 ? "" : "s"}</span>
      </div>
      <div className="rule mt-4" />

      {error && <div className="mt-4"><ErrorBanner message={error} onRetry={load} /></div>}
      {!brands && !error && <div className="mt-6 skeleton h-72" />}

      {brands && brands.length === 0 && (
        <div className="mt-8 border border-dashed border-linestrong px-6 py-14 text-center">
          <p className="font-editorial text-xl italic text-ink2">No style guides yet.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink2">
            A brand profile shapes every generation — personality, tone, values, words to use and words to avoid.
          </p>
          <Link href="/brands/new" className="mt-5 inline-block"><Button>Create your first brand</Button></Link>
        </div>
      )}

      {brands && brands.length > 0 && (
        <div className="mt-7 grid items-start gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-7">
            <BrandList brands={brands} activeId={activeId} onSelect={select} />
          </div>
          <div className="min-w-0">
            {active ? (
              <BrandDetail
                brand={active}
                onDeleted={() => {
                  if (activeId) router.replace("/brands");
                  load();
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrandsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl skeleton h-96" />}>
      <BrandsInner />
    </Suspense>
  );
}
