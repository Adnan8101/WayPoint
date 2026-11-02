"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { cx, fmtTime } from "@/lib/format";
import type { TimeValue } from "@/lib/types";
import { CheckIcon, CopyIcon, ShareIcon } from "./icons";

const focus = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200";
export const inputClass = (error?: boolean) =>
  cx(
    "h-12 w-full rounded-xl border bg-white px-3.5 text-[15.5px] text-ink placeholder:text-slate-400 transition-[border-color,box-shadow] focus:outline-none",
    error ? "border-red-400 focus:ring-4 focus:ring-red-100" : "border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
  );

export function Button({
  loading,
  variant = "primary",
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: "primary" | "secondary" | "ghost" | "dark" }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
        focus,
        variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
        variant === "dark" && "bg-ink text-white hover:bg-navy-700",
        variant === "secondary" && "border border-slate-300 bg-white text-ink hover:border-slate-400 hover:bg-slate-50",
        variant === "ghost" && "text-brand-700 hover:bg-brand-50",
        className,
      )}
    >
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium leading-5 text-slate-700">
      {children}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  id,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; id: string }) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={inputClass(!!error)}
      />
      {error ? (
        <p id={`${id}-err`} className="text-[13px] text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label, id, value, onChange, options, className,
}: { label: string; id: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputClass(), "cursor-pointer pr-8")}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-[var(--shadow-card)]", className)}>{children}</div>;
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className={cx(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-medium transition-colors",
        done ? "text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-ink",
        focus,
      )}
      aria-label={`Copy ${label ?? value}`}
      title={`Copy ${label ?? value}`}
    >
      {done ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
      <span className="sr-only sm:not-sr-only">{done ? "Copied" : "Copy"}</span>
    </button>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }
        } catch {
          /* cancelled */
        }
      }}
      className={cx("inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13.5px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-ink", focus)}
    >
      {done ? <CheckIcon width={15} height={15} /> : <ShareIcon width={15} height={15} />} {done ? "Link copied" : "Share"}
    </button>
  );
}

const KIND_STYLE: Record<TimeValue["kind"], string> = {
  scheduled: "bg-slate-100 text-slate-500",
  estimated: "bg-amber-50 text-amber-700",
  actual: "bg-brand-50 text-brand-700",
};
const KIND_LABEL: Record<TimeValue["kind"], string> = { scheduled: "Sched", estimated: "Est", actual: "Actual" };

/** A time with a small tag saying whether it's scheduled, estimated or actual. */
export function TimeTag({ t, timeZone, size = "md" }: { t?: TimeValue; timeZone?: string; size?: "md" | "lg" }) {
  if (!t) return <span className="font-mono text-slate-300">--:--</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("font-mono font-medium tabular-nums tracking-tight text-ink", size === "lg" ? "text-2xl" : "text-[15px]")}>{fmtTime(t, timeZone)}</span>
      <span className={cx("rounded px-1 py-px text-[10px] font-semibold uppercase tracking-wide", KIND_STYLE[t.kind])} title={`${t.kind} time`}>
        {KIND_LABEL[t.kind]}
      </span>
    </span>
  );
}

const TONES = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-brand-50 text-brand-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-800",
  violet: "bg-violet-50 text-violet-700",
};
const DOTS = {
  slate: "bg-slate-400",
  green: "bg-brand-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-sky-500",
  violet: "bg-violet-500",
};

/** Status chip with a coloured dot */
export function Pill({ tone = "slate", children, className, dot = true }: { tone?: keyof typeof TONES; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-medium", TONES[tone], className)}>
      {dot && <span className={cx("size-1.5 rounded-full", DOTS[tone])} aria-hidden />}
      {children}
    </span>
  );
}

/** Segmented control */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-xl bg-slate-100 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "rounded-lg px-4 py-1.5 text-[14px] font-medium transition-all",
            focus,
            value === t.value ? "bg-white text-ink shadow-[0_1px_3px_rgb(12_26_43/0.12)]" : "text-slate-500 hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
