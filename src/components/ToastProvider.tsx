"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };
const ToastCtx = createContext<{ push: (kind: Toast["kind"], message: string) => void }>({
  push: () => {},
});

export const useToast = () => useContext(ToastCtx);

const KIND_STYLES: Record<Toast["kind"], string> = {
  success: "border-l-ok",
  error: "border-l-danger",
  info: "border-l-linestrong",
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`fade-up pointer-events-auto border border-line border-l-2 bg-surface px-4 py-3 text-sm text-ink shadow-[var(--shadow-overlay)] ${KIND_STYLES[t.kind]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
