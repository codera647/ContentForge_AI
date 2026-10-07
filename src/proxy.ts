import { clerkMiddleware } from "@clerk/nextjs/server";
import { getClerkJwtKey } from "@/lib/clerk-config";
import {
  isProtectedAppPath,
  SIGN_IN_URL,
  SIGN_UP_URL,
} from "@/lib/auth-navigation";

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedAppPath(req.nextUrl.pathname)) {
    const session = await auth();
    if (!session.userId) {
      const { reason } = session.debug() as { reason?: string };
      // Keep deployment diagnostics useful without logging tokens, cookies, or keys.
      console.warn("[auth] Protected page rejected", {
        section: req.nextUrl.pathname.split("/")[1],
        reason: reason ?? session.sessionStatus ?? "no-session",
      });
    }
    await auth.protect();
  }
}, {
  jwtKey: getClerkJwtKey(),
  signInUrl: SIGN_IN_URL,
  signUpUrl: SIGN_UP_URL,
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
