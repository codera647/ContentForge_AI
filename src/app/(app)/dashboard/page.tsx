"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type ContentItem } from "@/lib/client";
import { Button, ErrorBanner, StatusBadge } from "@/components/ui";
import { CONTENT_TYPE_LABELS } from "@/lib/constants";

interface Stats {
  totalContent: number;
  drafts: number;
  scheduled: number;
  brands: number;
}
interface DashData {
  stats: Stats;
  recent: (Pick<ContentItem, "id" | "title" | "format" | "status" | "createdAt"> & { brand: { name: string } | null })[];
  upcoming: { id: string; scheduledAt: string; platform: string; content: { id: string; title: string; format: string } }[];
  ai: { name: string; configured: boolean; model: string };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtTime = (d: string | Date) =>
  new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api.get<DashData>("/api/stats").then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  if (error) return <ErrorBanner message={error} onRetry={load} />;

  if (!data)
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    );

  const { stats, recent, upcoming, ai } = data;

  return (
    <div className="mx-auto max-w-5xl fade-up">
      {/* Masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{greeting()}</h1>
          <p className="mt-1 text-sm text-ink2">Here&apos;s what&apos;s happening with your content.</p>
        </div>
        <Link href="/create">
          <Button>New content</Button>
        </Link>
      </div>

      {/* Counters — typographic, not cards */}
      <div className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-y border-line py-4">
        {[
          { n: stats.totalContent, label: "pieces created", href: "/library" },
          { n: stats.drafts, label: "in draft", href: "/library?status=draft" },
          { n: stats.scheduled, label: "scheduled", href: "/calendar" },
          { n: stats.brands, label: stats.brands === 1 ? "brand" : "brands", href: "/brands" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="group flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums text-ink group-hover:text-accent">{s.n}</span>
            <span className="text-sm text-ink2">{s.label}</span>
          </Link>
        ))}
        <span className="ml-auto self-center">
          {ai.configured ? (
            <span className="meta">
              {ai.name} · {ai.model}
            </span>
          ) : (
            <Link href="/settings" className="text-xs font-medium text-warn underline underline-offset-2">
              AI provider not configured
            </Link>
          )}
        </span>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Upcoming */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Upcoming</h2>
            <Link href="/calendar" className="text-xs text-ink2 underline underline-offset-2 hover:text-ink">
              Calendar
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-4 border-l-2 border-line pl-4 text-sm text-faint">
              Nothing scheduled. Schedule content from the library to plan your week.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-t border-line">
              {upcoming.map((s) => (
                <li key={s.id}>
                  <Link href={`/library/${s.content.id}`} className="group grid grid-cols-[72px_1fr_auto] items-baseline gap-3 py-2.5">
                    <span className="meta tabular-nums">{fmtDate(s.scheduledAt)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink group-hover:text-accent">
                        {s.content.title}
                      </span>
                      <span className="meta">{CONTENT_TYPE_LABELS[s.platform] ?? s.platform}</span>
                    </span>
                    <span className="meta tabular-nums">{fmtTime(s.scheduledAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent content */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="eyebrow">Recent content</h2>
            <Link href="/library" className="text-xs text-ink2 underline underline-offset-2 hover:text-ink">
              Library
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="mt-4 border-l-2 border-line pl-4">
              <p className="text-sm text-faint">Your desk is clear. Write your first piece.</p>
              <Link href="/create" className="mt-3 inline-block text-sm font-medium text-accent underline underline-offset-2">
                Create content →
              </Link>
            </div>
          ) : (
            <table className="mt-3 w-full border-t border-line text-left text-sm">
              <tbody className="divide-y divide-line">
                {recent.map((c) => (
                  <tr key={c.id} className="hover:bg-surface2">
                    <td className="max-w-0 py-2.5 pr-3">
                      <Link href={`/library/${c.id}`} className="block truncate font-medium text-ink hover:text-accent">
                        {c.title}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-ink2">
                      {CONTENT_TYPE_LABELS[c.format] ?? c.format}
                    </td>
                    <td className="hidden whitespace-nowrap py-2.5 pr-3 text-xs text-faint sm:table-cell">
                      {c.brand?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-right">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
