"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/lib/client";
import { GOOGLE_CALENDAR_SCOPE } from "@/lib/calendar/constants";
import { Button, ErrorBanner } from "@/components/ui";
import { useToast } from "@/components/ToastProvider";

type ConnectionStatus = { connected: boolean; pending: number };

export default function GoogleCalendarConnection({ onSynced, refreshToken }: { onSynced?: () => void; refreshToken?: string }) {
  const { user, isLoaded } = useUser();
  const { push } = useToast();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const callbackHandled = useRef(false);
  const load = useCallback(async () => {
    const result = await api.get<ConnectionStatus>("/api/calendar/google");
    setStatus(result);
  }, []);

  useEffect(() => {
    let active = true;
    api.get<ConnectionStatus>("/api/calendar/google")
      .then((result) => { if (active) setStatus(result); })
      .catch((error: Error) => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [refreshToken]);

  const sync = useCallback(async () => {
    const result = await api.post<{ synced: number; errors: string[] }>("/api/calendar/google/sync", {});
    await load();
    onSynced?.();
    if (result.errors.length) setError(result.errors[0]);
    else push("success", `${result.synced} schedule${result.synced === 1 ? "" : "s"} synced to Google Calendar.`);
  }, [load, onSynced, push]);

  useEffect(() => {
    if (!isLoaded || !user || callbackHandled.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("google") !== "connected") return;
    callbackHandled.current = true;
    url.searchParams.delete("google");
    window.history.replaceState(null, "", url);
    api.post("/api/calendar/google", {}).then(async () => {
      await load();
      await sync();
    }).catch((error: Error) => setError(error.message));
  }, [isLoaded, user, load, sync]);

  const connect = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const account = user.externalAccounts.find((account) => account.provider === "google");
      // Reauthorize even if previously approved: Google may have revoked that grant.
      const params = { redirectUrl: `${window.location.origin}/calendar?google=connected`, additionalScopes: [GOOGLE_CALENDAR_SCOPE] };
      const result = account
        ? await account.reauthorize(params)
        : await user.createExternalAccount({ strategy: "oauth_google", ...params });
      const redirect = result.verification?.externalVerificationRedirectURL;
      if (redirect) { window.location.assign(redirect.href); return; }
      await api.post("/api/calendar/google", {});
      await load();
      await sync();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Google Calendar could not be connected. Please try again.");
    } finally { setBusy(false); }
  };

  const pause = async () => {
    setBusy(true); setError(null);
    try { await api.del("/api/calendar/google"); await load(); push("info", "Google sync paused. Existing events stay in your Google calendar."); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not pause sync"); }
    finally { setBusy(false); }
  };

  return (
    <section className="my-5 border-y border-line py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Google Calendar {status?.connected && <span className="text-ok">· Connected</span>}</h2>
          <p className="mt-1 text-xs text-ink2">{status?.connected ? `Scheduled content syncs to your primary calendar. ${status.pending ? `${status.pending} changes waiting to sync.` : ""}` : "Connect your Google account to add scheduled content to your calendar."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={busy} disabled={!isLoaded || !user} onClick={connect}>{status?.connected ? "Reconnect" : "Connect Google Calendar"}</Button>
          {status?.connected && <>
            <Button variant="secondary" disabled={busy} onClick={async () => {
              setBusy(true); setError(null);
              try { await sync(); } catch (error) { setError(error instanceof Error ? error.message : "Sync failed"); } finally { setBusy(false); }
            }}>Sync pending{status.pending ? ` (${status.pending})` : ""}</Button>
            <Button variant="tertiary" disabled={busy} onClick={pause}>Pause sync</Button>
          </>}
        </div>
      </div>
      {error && <div className="mt-3"><ErrorBanner message={error} /></div>}
    </section>
  );
}
