"use client";

import { useRouter } from "next/navigation";
import BrandForm from "@/components/BrandForm";
import { api, type Brand } from "@/lib/client";

export default function NewBrandPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl fade-up">
      <h1 className="text-[28px] font-semibold tracking-tight">New brand</h1>
      <p className="mt-1 text-sm text-ink2">
        Everything here is woven into the AI prompts — the more specific, the more distinct the voice.
      </p>
      <div className="rule mt-4" />
      <div className="mt-7">
        <BrandForm
          onSubmit={async (data) => {
            const { brand } = await api.post<{ brand: Brand }>("/api/brands", data);
            router.push(`/brands?id=${brand.id}`);
          }}
          submitLabel="Create brand"
        />
      </div>
    </div>
  );
}
