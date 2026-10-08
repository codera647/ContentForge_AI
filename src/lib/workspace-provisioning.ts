import "server-only";

import { unstable_rethrow } from "next/navigation";
import { PublicApiError } from "@/lib/server-errors";

type WorkspaceStage = "session" | "database_read" | "clerk_profile" | "database_write";

function failureCode(error: unknown) {
  if (!error || typeof error !== "object") return "unknown";
  const details = error as { code?: unknown; errorCode?: unknown; status?: unknown; name?: unknown; cause?: { code?: unknown } };
  const prismaCode = details.code ?? details.errorCode;
  if (typeof prismaCode === "string" && /^P\d{4}$/.test(prismaCode)) return prismaCode;
  if (typeof details.status === "number" && Number.isInteger(details.status) && details.status >= 100 && details.status <= 599) {
    return `http_${details.status}`;
  }
  const networkCode = details.cause?.code ?? details.code;
  if (typeof networkCode === "string" && /^(ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|ABORT_ERR)$/.test(networkCode)) {
    return networkCode;
  }
  if (details.name === "AbortError" || details.name === "TimeoutError") return "timeout";
  return "unknown";
}

/** Report the failing dependency without exposing database URLs, profile data, or credentials. */
export async function workspaceStep<T>(stage: WorkspaceStage, operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    unstable_rethrow(error);
    if (error instanceof PublicApiError) throw error;
    const code = `workspace_${stage}_${failureCode(error)}`;
    console.error("[workspace] Provisioning failed", { stage, code });
    throw new PublicApiError("Your workspace is temporarily unavailable. Please try again.", 503, code);
  }
}
