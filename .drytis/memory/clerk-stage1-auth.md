Clerk auth was added in Stage 1 (ticket #12553, commit 1621559 on deploy-ready, NOT yet on master).

Key facts for future sessions:
- @clerk/nextjs ^7.9.4 ("Core 3"): <SignedIn>/<SignedOut>/<Protect> are REMOVED — use <Show when="signed-in|signed-out"> from @clerk/nextjs instead. UserButton no longer takes afterSignOutUrl. Clerk appearance `Variables` uses colorForeground/colorMutedForeground (no colorText/colorInputBackground/colorInputText).
- Next.js 16 uses src/proxy.ts (clerkMiddleware + createRouteMatcher), matcher includes '/__clerk/:path*'. Build output shows "ƒ Proxy (Middleware)".
- Protected: /dashboard /create /brands /library /calendar /settings (auth.protect → 307 for signed-out). Public: / (landing), /sign-in, /sign-up, APIs.
- User's real Clerk app: app_3JihKoJEpHA7nfI1BJWrHm0ba1T — keys NOT in Drytis (exist only in Vercel env per user). Interactive clerk auth login impossible in container (OAuth browser flow).
- Local dev uses Clerk ACCOUNTLESS keys from `npx clerk init` (unclaimed instance ins_3JinCvJuRUyqxvC9W2PfLlId0wn, thor. .env.local created by clerk CLI; values synced via set_env_value dev-scope on env keys 51681/51682). .env.local is gitignored — safe.
- Placeholder Clerk keys break the site: Clerk JS handshake hits the fake FAPI host, SSL fails, page never hydrates, and /dashboard serves a 500 prerender error. A syntactically-valid FAKE pk also breaks the browser. Only the accountless real keys work locally.
- NEXT_PUBLIC_* env changes require a REBUILD (npm run build) — values are inlined at build time; restarting the service alone is not enough.
- Landing page: src/app/page.tsx with src/components/landing/Reveal.tsx (IntersectionObserver, prefers-reduced-motion). Dashboard moved to src/app/dashboard/page.tsx.
- Stage 1 limits: NO per-user DB isolation yet (getDefaultUserId still returns the single seeded user; all data shared). Stage 2 = schema + per-user data.
- Stage 1 code is on origin/deploy-ready (commit 1621559), not merged to master.
- Browser testing quirk: headless Chrome in this container gets ERR_SSL_VERSION_OR_CIPHER_MISMATCH on https (TLS interception). Playwright still works against http://localhost:3000 for content checks; Clerk handshake fails there but page HTML/content renders.