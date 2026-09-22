"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Brand } from "@/lib/client";
import BrandForm from "@/components/BrandForm";
import { ErrorBanner } from "@/components/ui";

export default function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ brand: Brand }>(`/api/brands/${id}`)
      .then((d) => setBrand(d.brand))
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div className="mx-auto max-w-2xl fade-up">
      <h1 className="text-[28px] font-semibold tracking-tight">Edit brand</h1>
      <div className="rule mt-4" />
      {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
      {!brand && !error && <div className="mt-6 skeleton h-96" />}
      {brand && (
        <div className="mt-7">
          <BrandForm
            initial={brand}
            onSubmit={async (data) => {
              await api.patch(`/api/brands/${id}`, data);
              router.push(`/brands?id=${id}`);
            }}
            submitLabel="Save changes"
          />
        </div>
      )}
    </div>
  );
}
