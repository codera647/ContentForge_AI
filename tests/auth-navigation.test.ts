import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUTHENTICATED_HOME,
  isProtectedAppPath,
  SIGN_IN_URL,
  SIGN_UP_URL,
} from "@/lib/auth-navigation";

describe("Clerk navigation", () => {
  it("uses application-owned auth routes and dashboard fallbacks", () => {
    expect(SIGN_IN_URL).toBe("/sign-in");
    expect(SIGN_UP_URL).toBe("/sign-up");
    expect(AUTHENTICATED_HOME).toBe("/dashboard");

    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("signInUrl={SIGN_IN_URL}");
    expect(layout).toContain("signUpUrl={SIGN_UP_URL}");
    expect(layout).toContain("signInFallbackRedirectUrl={AUTHENTICATED_HOME}");
    expect(layout).toContain("signUpFallbackRedirectUrl={AUTHENTICATED_HOME}");

    const proxy = readFileSync(resolve(process.cwd(), "src/proxy.ts"), "utf8");
    expect(proxy).toContain("signInUrl: SIGN_IN_URL");
    expect(proxy).toContain("signUpUrl: SIGN_UP_URL");
  });

  it("keeps every application section protected without prefix collisions", () => {
    for (const pathname of [
      "/dashboard",
      "/dashboard/activity",
      "/create",
      "/brands/brand-a",
      "/library/content-a",
      "/calendar",
      "/settings/profile",
    ]) {
      expect(isProtectedAppPath(pathname)).toBe(true);
    }

    for (const pathname of ["/", "/sign-in", "/dashboard-preview", "/api/stats"]) {
      expect(isProtectedAppPath(pathname)).toBe(false);
    }
  });

  it("pins the account UI to Clerk's supported modal mode", () => {
    const accountButton = readFileSync(
      resolve(process.cwd(), "src/components/AccountButton.tsx"),
      "utf8"
    );
    expect(accountButton).toContain('userProfileMode="modal"');
  });

  it("uses non-prefetched dashboard links from the public landing page", () => {
    const landing = readFileSync(
      resolve(process.cwd(), "src/app/(public)/page.tsx"),
      "utf8"
    );
    expect(landing.match(/href=\{AUTHENTICATED_HOME\}/g)).toHaveLength(4);
    expect(landing.match(/prefetch=\{false\}/g)).toHaveLength(4);
  });
});
