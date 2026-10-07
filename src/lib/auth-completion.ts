export type AuthCompletion = { ready: true } | { ready: false; error: string; reason?: string };

/** Verify dashboard authorization on the server before leaving the auth screen. */
export async function verifyWorkspaceSession(request: () => Promise<Response>, refresh: () => Promise<unknown>): Promise<AuthCompletion> {
  try {
    let response = await request();
    if (response.status === 401) { await refresh(); response = await request(); }
    if (response.ok) return { ready: true };
    if (response.status === 401) return {
      ready: false,
      error: "You're signed in, but this app couldn't verify your session. Try again. If this continues, the app's authentication configuration needs to be corrected.",
      reason: response.headers.get("x-clerk-auth-reason") ?? undefined,
    };
    const body = await response.json().catch(() => null) as { error?: string } | null;
    return { ready: false, error: body?.error || "Your workspace is temporarily unavailable. Please try again." };
  } catch {
    return { ready: false, error: "We couldn't connect to your workspace. Check your connection and try again." };
  }
}
