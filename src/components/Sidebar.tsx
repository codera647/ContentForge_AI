"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import AccountButton from "@/components/AccountButton";
import { AUTHENTICATED_HOME } from "@/lib/auth-navigation";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/create", label: "Create" },
  { href: "/library", label: "Library" },
  { href: "/calendar", label: "Calendar" },
];

const SECONDARY_NAV = [
  { href: "/brands", label: "Brands" },
  { href: "/settings", label: "Settings" },
];

function NavLink({ item, active, onClick }: { item: { href: string; label: string }; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`relative -mx-2 flex items-center border-l-2 px-2 py-[7px] text-[13.5px] font-medium ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-ink2 hover:border-linestrong hover:text-ink"
      }`}
    >
      {item.label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/dashboard" ? pathname.startsWith("/dashboard") : pathname.startsWith(href));

  const nav = (
    <>
      <nav className="flex flex-col gap-0.5">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} onClick={() => setOpen(false)} />
        ))}
      </nav>
      <div className="rule my-4" />
      <nav className="flex flex-col gap-0.5">
        {SECONDARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} onClick={() => setOpen(false)} />
        ))}
      </nav>
    </>
  );

  const wordmark = (
    <Link href="/dashboard" className="mb-7 flex items-baseline gap-1.5">
      <span className="text-[17px] font-semibold tracking-tight text-ink">
        ContentForge
      </span>
      <span className="text-[17px] font-medium tracking-tight text-accent">AI</span>
    </Link>
  );

  const account = (
    <Show when="signed-in">
      <div className="flex items-center gap-2">
        <AccountButton />
        <span className="meta">Account</span>
      </div>
    </Show>
  );

  const signedOutActions = (
    <div className="flex flex-col gap-2">
      <SignInButton mode="modal" fallbackRedirectUrl={AUTHENTICATED_HOME}>
        <button className="rounded-[8px] border border-linestrong px-3 py-[7px] text-left text-[13.5px] font-medium text-ink transition-colors duration-150 hover:border-accent hover:text-accent">
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal" fallbackRedirectUrl={AUTHENTICATED_HOME}>
        <button className="rounded-[8px] bg-accent px-3 py-[7px] text-left text-[13.5px] font-medium text-white transition-colors duration-150 hover:bg-accentdark">
          Get started
        </button>
      </SignUpButton>
    </div>
  );

  return (
    <>
      {/* Mobile bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-canvas px-5 py-3 lg:hidden">
        {wordmark}
        <button
          aria-label="Toggle navigation"
          onClick={() => setOpen(!open)}
          className="rounded-[6px] border border-linestrong px-3 py-1 text-sm text-ink2"
        >
          Menu
        </button>
      </header>
      {open && (
        <div className="z-30 border-b border-line bg-canvas px-5 py-3 lg:hidden" onClick={() => setOpen(false)}>
          {nav}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col border-r border-line bg-canvas px-5 py-7 lg:flex">
        {wordmark}
        {nav}
        <div className="mt-auto pt-6">
          <Show when="signed-in">{account}</Show>
          <Show when="signed-out">{signedOutActions}</Show>
          <p className="meta mt-4">ContentForge AI</p>
          <p className="meta">v1.0</p>
        </div>
      </aside>
    </>
  );
}
