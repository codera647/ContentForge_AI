"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Reveal from "@/components/landing/Reveal";

const FORMATS = [
  "LinkedIn",
  "X / Twitter",
  "Instagram",
  "Facebook",
  "Marketing Email",
  "Ad Copy",
  "Product Description",
  "Blog",
];

const WORKFLOW = [
  {
    n: "01",
    title: "Define your brand voice",
    text: "Personality, tone, audience, values, phrases to use — and phrases to avoid. A reusable voice profile, not a prompt you retype.",
  },
  {
    n: "02",
    title: "Generate content",
    text: "One brief, up to three distinct takes — direct, story-driven, educational — each written in your configured voice.",
  },
  {
    n: "03",
    title: "Repurpose across formats",
    text: "Turn a LinkedIn post into an X post, an email, or ad copy. The idea survives the format change; so does the voice.",
  },
  {
    n: "04",
    title: "Schedule and organize",
    text: "Drafts, edits, search, and a monthly calendar. Content moves from idea to planned publication in one workspace.",
  },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-baseline gap-1.5">
      <span className="text-[17px] font-semibold tracking-tight text-ink">ContentForge</span>
      <span className="text-[17px] font-medium tracking-tight text-accent">AI</span>
    </Link>
  );
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 lg:px-8">
        <Wordmark />
        <nav className="hidden items-center gap-6 text-[13.5px] font-medium text-ink2 md:flex">
          <a href="#features" className="transition-colors duration-150 hover:text-ink">Features</a>
          <a href="#how" className="transition-colors duration-150 hover:text-ink">How it Works</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-[8px] bg-accent px-3.5 py-[7px] text-[13.5px] font-medium text-white transition-colors duration-150 hover:bg-accentdark"
            >
              Go to Dashboard
            </Link>
            <UserButton  />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-[8px] border border-linestrong px-3.5 py-[7px] text-[13.5px] font-medium text-ink transition-colors duration-150 hover:border-accent hover:text-accent">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-[8px] bg-accent px-3.5 py-[7px] text-[13.5px] font-medium text-white transition-colors duration-150 hover:bg-accentdark">
                Get Started
              </button>
            </SignUpButton>
          </Show>
        </div>
      </div>
    </header>
  );
}

/** Original product visualization: brief panel + generated-content preview. */
function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
      <div className="grid md:grid-cols-[240px_minmax(0,1fr)]">
        {/* brief panel */}
        <div className="border-b border-line px-5 py-5 md:border-b-0 md:border-r">
          <p className="meta mb-3">Brief</p>
          <dl className="space-y-3 text-[13px] leading-snug">
            <div>
              <dt className="text-ink2">Brand</dt>
              <dd className="font-medium text-ink">Pulse Athletics</dd>
            </div>
            <div>
              <dt className="text-ink2">Tone</dt>
              <dd className="font-medium text-ink">Motivational · Confident</dd>
            </div>
            <div>
              <dt className="text-ink2">Format</dt>
              <dd className="font-medium text-ink">LinkedIn</dd>
            </div>
            <div>
              <dt className="text-ink2">Variations</dt>
              <dd className="font-medium text-ink">3</dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-line pt-3">
            <p className="meta">Avoided phrases</p>
            <p className="mt-1 text-[12px] leading-snug text-ink2">
              “miracle transformation” · “guaranteed results”
            </p>
          </div>
        </div>
        {/* generated preview */}
        <div className="px-6 py-5 md:px-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-[6px] bg-accentsubtle px-2 py-0.5 text-[11.5px] font-medium text-accentdark">
              Variation 1 · Direct
            </span>
            <span className="meta">LinkedIn</span>
          </div>
          <h3 className="font-serif text-[19px] font-semibold leading-snug text-ink">
            Your strongest workout isn&apos;t your hardest one
          </h3>
          <div className="mt-3 space-y-2.5 text-[13.5px] leading-relaxed text-ink2">
            <p>
              It&apos;s the one you come back for tomorrow. Progress compounds — not
              through heroic weeks, but through unremarkable Tuesdays.
            </p>
            <p>
              Add one rep. Walk ten minutes further. Keep showing up. That&apos;s the
              whole method, and it works precisely because it&apos;s boring.
            </p>
            <p className="font-medium text-ink">Train with purpose. Start today.</p>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
            <span className="rounded-[6px] border border-line px-2 py-0.5 text-[11.5px] text-ink2">
              Variation 2 · Story-driven
            </span>
            <span className="rounded-[6px] border border-line px-2 py-0.5 text-[11.5px] text-ink2">
              Variation 3 · Educational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Repurposing transformation visual. */
function RepurposeFlow() {
  const steps = [
    { label: "LinkedIn Post", note: "800 words, narrative arc" },
    { label: "X Post", note: "One idea, 240 characters" },
    { label: "Marketing Email", note: "Subject line + body + CTA" },
    { label: "Ad Copy", note: "Hook and offer only" },
  ];
  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <Reveal key={s.label} delay={i * 90}>
          <div className="flex items-start gap-4 py-3">
            <span className="mt-[3px] font-serif text-[13px] tabular-nums text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1 border-b border-line pb-3">
              <p className="text-[14.5px] font-medium text-ink">{s.label}</p>
              <p className="text-[12.5px] text-ink2">{s.note}</p>
            </div>
            {i < steps.length - 1 && <span className="mt-[2px] text-ink2">↓</span>}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LandingNav />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:pt-20 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <Reveal>
              <p className="meta mb-4">Generative AI content platform</p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="font-serif text-[38px] font-semibold leading-[1.08] tracking-tight text-ink md:text-[52px]">
                Create content that still sounds like you.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-ink2">
                ContentForge AI learns your brand voice and helps you create,
                repurpose, organize, and schedule content across channels from
                one focused workspace.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Show when="signed-out">
                  <SignUpButton mode="modal">
                    <button className="rounded-[8px] bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-accentdark">
                      Start Creating
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="rounded-[8px] bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-accentdark"
                  >
                    Go to Dashboard
                  </Link>
                </Show>
                <a
                  href="#how"
                  className="rounded-[8px] border border-linestrong px-5 py-2.5 text-[14px] font-medium text-ink transition-colors duration-150 hover:border-accent hover:text-accent"
                >
                  See How It Works
                </a>
              </div>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <ProductPreview />
          </Reveal>
        </div>
      </section>

      {/* WORKFLOW — editorial numbered steps, not card grid */}
      <section id="how" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <Reveal>
            <h2 className="font-serif text-[28px] font-semibold tracking-tight text-ink">
              How it works
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-x-12 gap-y-2 md:grid-cols-2">
            {WORKFLOW.map((w, i) => (
              <Reveal key={w.n} delay={i * 80}>
                <div className="flex gap-5 border-b border-line py-5">
                  <span className="font-serif text-[15px] tabular-nums text-accent">{w.n}</span>
                  <div>
                    <h3 className="text-[15.5px] font-medium text-ink">{w.title}</h3>
                    <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-ink2">{w.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* BRAND VOICE */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div>
            <Reveal>
              <p className="meta mb-3">Brand voice</p>
              <h2 className="font-serif text-[28px] font-semibold leading-snug tracking-tight text-ink">
                Your voice, written down once — applied everywhere.
              </h2>
              <p className="mt-4 max-w-[50ch] text-[14.5px] leading-relaxed text-ink2">
                Configure a brand profile with personality, tone, audience,
                values, preferred phrases, avoided phrases, and writing style.
                Every generation reads it first — so a fitness brand writes like
                a coach, and a finance brand writes like an advisor.
              </p>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <div className="rounded-[10px] border border-line bg-surface px-6 py-5">
              <p className="meta mb-3">Voice profile — example</p>
              <dl className="grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
                <div><dt className="text-ink2">Personality</dt><dd className="font-medium text-ink">Energetic, disciplined, direct</dd></div>
                <div><dt className="text-ink2">Tone</dt><dd className="font-medium text-ink">Motivational · confident</dd></div>
                <div><dt className="text-ink2">Audience</dt><dd className="font-medium text-ink">Everyday athletes, 20–40</dd></div>
                <div><dt className="text-ink2">Values</dt><dd className="font-medium text-ink">Consistency · sustainable progress</dd></div>
                <div><dt className="text-ink2">Preferred phrases</dt><dd className="font-medium text-ink">“Keep showing up” · “Progress compounds”</dd></div>
                <div><dt className="text-ink2">Avoided phrases</dt><dd className="font-medium text-ink">“Miracle transformation” · “Guaranteed results”</dd></div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* MULTI-FORMAT */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <Reveal>
            <p className="meta mb-3">Formats</p>
            <h2 className="max-w-[30ch] font-serif text-[28px] font-semibold leading-snug tracking-tight text-ink">
              Eight formats. One consistent voice.
            </h2>
          </Reveal>
          <ul className="mt-8 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {FORMATS.map((f, i) => (
              <Reveal key={f} delay={i * 50} as="li">
                <span className="flex items-baseline gap-3 border-b border-line py-3.5 text-[14.5px] font-medium text-ink">
                  <span className="font-serif text-[12px] tabular-nums text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {f}
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* REPURPOSING */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <Reveal>
            <p className="meta mb-3">Repurposing</p>
            <h2 className="font-serif text-[28px] font-semibold leading-snug tracking-tight text-ink">
              One idea, every channel.
            </h2>
            <p className="mt-4 max-w-[50ch] text-[14.5px] leading-relaxed text-ink2">
              Write it once as a LinkedIn post, then adapt it for X, email, or
              ad copy — with the brand voice preserved through every
              transformation. No more rewriting the same thought five times.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <RepurposeFlow />
          </Reveal>
        </div>
      </section>

      {/* CONTENT WORKSPACE */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <Reveal>
            <h2 className="font-serif text-[28px] font-semibold tracking-tight text-ink">
              A workspace, not a chat window.
            </h2>
            <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-ink2">
              Generated content lands in a real library — searchable, editable,
              duplicateable, and schedulable. Everything you make has a place,
              and a date.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-x-12 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Content Library", "Every draft and published piece, one list."],
              ["Search & filter", "Find by brand, format, status, or phrase."],
              ["Editing", "Refine any generation in a serif reading view."],
              ["Drafts", "Variations saved side by side, ready to compare."],
              ["Scheduling", "Attach a date and time to any piece."],
              ["Calendar", "A monthly grid of what ships when."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 60}>
                <div className="border-b border-line py-4">
                  <p className="text-[14.5px] font-medium text-ink">{t}</p>
                  <p className="mt-1 text-[13px] text-ink2">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20 text-center lg:px-8">
        <Reveal>
          <h2 className="mx-auto max-w-[24ch] font-serif text-[30px] font-semibold leading-snug tracking-tight text-ink md:text-[36px]">
            Your brand already has a voice. ContentForge helps you use it consistently.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className="mt-8">
            <Show when="signed-out">
              <SignUpButton mode="modal">
                <button className="rounded-[8px] bg-accent px-6 py-3 text-[14.5px] font-medium text-white transition-colors duration-150 hover:bg-accentdark">
                  Create Your Brand
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-[8px] bg-accent px-6 py-3 text-[14.5px] font-medium text-white transition-colors duration-150 hover:bg-accentdark"
              >
                Go to Dashboard
              </Link>
            </Show>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <Wordmark />
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-ink2">
            <a href="#features" className="transition-colors duration-150 hover:text-ink">Features</a>
            <a href="#how" className="transition-colors duration-150 hover:text-ink">How it Works</a>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="transition-colors duration-150 hover:text-ink">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="transition-colors duration-150 hover:text-ink">Get Started</button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="transition-colors duration-150 hover:text-ink">
                Dashboard
              </Link>
            </Show>
          </nav>
          <Show when="signed-in">
            <UserButton  />
          </Show>
        </div>
      </footer>
    </div>
  );
}
