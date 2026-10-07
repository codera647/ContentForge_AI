import { NextResponse } from "next/server";
import { PublicApiError } from "@/lib/server-errors";

export function handleApiError(error: unknown, context: string, fallback: string) {
  if (error instanceof PublicApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error(`[${context}]`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json(); }
  catch { throw new PublicApiError("Invalid JSON body", 400, "invalid_json"); }
}
