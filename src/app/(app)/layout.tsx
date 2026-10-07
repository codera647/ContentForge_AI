import Sidebar from "@/components/Sidebar";
import { redirect, unstable_rethrow } from "next/navigation";
import { ensureCurrentWorkspace } from "@/lib/auth";
import { PublicApiError } from "@/lib/server-errors";
import WorkspaceError from "@/components/WorkspaceError";
import { SIGN_IN_URL } from "@/lib/auth-navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let failure: string | null = null;
  let signedOut = false;
  try { await ensureCurrentWorkspace(); }
  catch (error) {
    unstable_rethrow(error);
    signedOut = error instanceof PublicApiError && error.status === 401;
    failure = error instanceof PublicApiError ? error.message : "Your workspace is temporarily unavailable. Please try again.";
    if (!(error instanceof PublicApiError)) console.error("[workspace] Provisioning failed");
  }
  if (signedOut) redirect(SIGN_IN_URL);
  if (failure) return <WorkspaceError message={failure} />;
  return (
    <>
      <Sidebar />
      <main className="px-5 py-7 lg:ml-[228px] lg:px-10">{children}</main>
    </>
  );
}
