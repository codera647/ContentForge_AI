"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-accent">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-faint">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-[6px] border border-linestrong bg-surface px-2.5 py-[7px] text-sm text-ink placeholder:text-faint outline-none focus:border-accent disabled:opacity-50";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} min-h-[84px] resize-y ${props.className ?? ""}`} />;
}

export function Select({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} className={`${inputBase} ${props.className ?? ""}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Button({
  variant = "primary",
  loading,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  loading?: boolean;
}) {
  const variants = {
    primary: "bg-accent text-white hover:bg-accentdark disabled:bg-accent/50",
    secondary: "border border-linestrong bg-surface text-ink hover:bg-surface2",
    tertiary: "text-ink2 hover:text-ink",
    danger: "border border-danger/40 bg-transparent text-danger hover:bg-danger/10",
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[6px] px-3 py-[7px] text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {props.children}
    </button>
  );
}

export function Chip({ label }: { label: string }) {
  return <span className="text-xs text-ink2">{label}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "text-faint",
    scheduled: "text-accent",
    published: "text-ok",
    archived: "text-warn",
  };
  return (
    <span className={`text-xs font-medium capitalize ${styles[status] ?? styles.draft}`}>{status}</span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-linestrong px-6 py-14 text-center">
      <h3 className="font-[600] text-ink">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 text-xs font-medium text-danger underline underline-offset-2">
          Retry
        </button>
      )}
    </div>
  );
}

/** Tag input: type + Enter or comma to add. Value is string[]. */
export function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().replace(/,+$/, "");
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className={inputBase + " flex min-h-[38px] flex-wrap items-center gap-x-2 gap-y-1 !py-1.5"}>
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 text-[13px] text-ink">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} className="text-faint hover:text-danger">
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[120px] flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
      />
    </div>
  );
}
