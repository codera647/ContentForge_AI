"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ErrorBanner } from "@/components/ui";

interface Stats {
  ai: { name: string; configured: boolean; model: string };
  stats: { totalContent: number; brands: number };
}

export default function SettingsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Stats>("/api/stats").then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-2xl fade-up">
      <h1 className="text-[28px] font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-ink2">Environment and provider configuration.</p>
      <div className="rule mt-4" />

      {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
      {!data && !error && <div className="mt-6 skeleton h-56" />}

      {data && (
        <div className="mt-7 space-y-10">
          <section>
            <h2 className="eyebrow border-b border-line pb-2">AI provider</h2>
            <dl className="mt-4 divide-y divide-line">
              <div className="flex items-baseline justify-between py-2.5">
                <dt className="text-sm text-ink2">Provider</dt>
                <dd className={`text-sm font-medium ${data.ai.configured ? "text-ok" : "text-warn"}`}>
                  {data.ai.name} {data.ai.configured ? "· connected" : "· not configured"}
                </dd>
              </div>
              <div className="flex items-baseline justify-between py-2.5">
                <dt className="text-sm text-ink2">Model</dt>
                <dd className="text-sm text-ink">{data.ai.model}</dd>
              </div>
              <div className="flex items-baseline justify-between py-2.5">
                <dt className="text-sm text-ink2">API key</dt>
                <dd className="text-sm text-faint">{data.ai.configured ? "stored server-side" : "missing"}</dd>
              </div>
            </dl>
            {!data.ai.configured && (
              <p className="mt-3 border border-warn/30 bg-warn/5 px-3 py-2 text-xs leading-relaxed text-warn">
                Set <code className="font-mono">AI_PROVIDER</code> and the matching API key in your environment, then
                restart. Set <code className="font-mono">AI_PROVIDER=mock</code> to explore the app offline.
              </p>
            )}
          </section>

          <section>
            <h2 className="eyebrow border-b border-line pb-2">Workspace</h2>
            <dl className="mt-4 divide-y divide-line">
              <div className="flex items-baseline justify-between py-2.5">
                <dt className="text-sm text-ink2">Content items</dt>
                <dd className="text-sm tabular-nums text-ink">{data.stats.totalContent}</dd>
              </div>
              <div className="flex items-baseline justify-between py-2.5">
                <dt className="text-sm text-ink2">Brands</dt>
                <dd className="text-sm tabular-nums text-ink">{data.stats.brands}</dd>
              </div>
              <div className="flex items-baseline justify-between py-2.5">
                <dt className="text-sm text-ink2">Version</dt>
                <dd className="text-sm text-ink">1.0.0</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
