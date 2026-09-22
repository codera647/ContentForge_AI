"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors?: Record<string, string[]>
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const d = (data ?? {}) as { error?: string; fieldErrors?: Record<string, string[]> };
    throw new ApiError(d.error || `Request failed (${res.status})`, res.status, d.fieldErrors);
  }
  return data as T;
}

export const api = {
  get: <T,>(url: string) => request<T>(url),
  post: <T,>(url: string, body: unknown) => request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  patch: <T,>(url: string, body: unknown) => request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T,>(url: string) => request<T>(url, { method: "DELETE" }),
};

// ---------- shared types ----------

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  industry?: string | null;
  targetAudience?: string | null;
  personality?: string | null;
  tone?: string | null;
  values?: string[] | null;
  preferredPhrases?: string[] | null;
  avoidedPhrases?: string[] | null;
  writingStyle?: string | null;
  exampleContent?: string | null;
  createdAt: string;
  _count?: { content: number };
}

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  format: string;
  status: string;
  topic?: string | null;
  audience?: string | null;
  objective?: string | null;
  tone?: string | null;
  keywords?: string[] | null;
  cta?: string | null;
  brandId?: string | null;
  brand?: { name: string } | null;
  sourceContentId?: string | null;
  variationIndex: number;
  repurposed?: { id: string; title: string; format: string }[];
  createdAt: string;
  updatedAt: string;
  schedules?: { id: string; scheduledAt: string; platform: string; status: string }[];
}

export interface ScheduleItem {
  id: string;
  contentId: string;
  platform: string;
  scheduledAt: string;
  status: string;
  content: { id: string; title: string; body: string; format: string; status: string; brand?: { name: string } | null };
}

export interface Variation {
  title: string;
  body: string;
  strategy: string;
}
