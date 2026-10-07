"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountButton from "@/components/AccountButton";
import { Button } from "@/components/ui";

export default function WorkspaceError({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-lg content-center gap-4 px-5">
      <h1 className="text-2xl font-semibold">We couldn&apos;t open your workspace</h1>
      <p className="text-sm text-ink2">{message}</p>
      <div className="flex items-center gap-4">
        <Button onClick={() => router.refresh()}>Try again</Button>
        <AccountButton />
        <Link href="/" className="text-sm text-accent">Home</Link>
      </div>
    </div>
  );
}
