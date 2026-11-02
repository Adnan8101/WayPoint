"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { cx, fmtTime } from "@/lib/format";
import type { TimeValue } from "@/lib/types";
import { CheckIcon, CopyIcon, ShareIcon } from "./icons";
import { useIndicator } from "./motion";

const focus = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal/50";
export const inputClass = (error?: boolean) =>
  cx(
    "h-12 w-full rounded-[14px] border bg-slate-50 px-4 text-[15.5px] font-medium text-ink placeholder:font-normal placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgb(29_22_12/0.05)] transition-[border-color,box-shadow,background-color] duration-200 focus:bg-white focus:outline-none",
    error
      ? "border-red-400 bg-red-50/40 focus:shadow-[0_0_0_4px_rgb(239_68_68/0.15)]"
      : "border-slate-200 hover:border-slate-300 hover:bg-white focus:border-ink focus:shadow-[0_0_0_4px_rgb(255_194_26/0.35)]",
  );

const SELECT_CHEVRON =
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12'%3E%3Cpath d='M3 4.5l3 3 3-3' fill='none' stroke='%237a7264' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E\")] bg-[position:right_16px_center] bg-no-repeat";

export function Button({
  loading,
  variant = "primary",
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: "primary" | "secondary" | "ghost" | "dark" }) {
  const solid = variant === "primary" || variant === "dark";
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "group/btn relative isolate inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-[14px] px-6 text-[15px] font-semibold transition-[transform,box-shadow,background-color,color] duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
        focus,
        solid && "bg-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_8px_18px_-8px_rgb(11_13_16/0.6)] enabled:hover:text-ink enabled:hover:shadow-[0_12px_24px_-10px_rgb(230_160_0/0.7)]",
        variant === "secondary" && "border border-slate-200 bg-white text-ink shadow-[var(--shadow-card)] hover:border-slate-300 hover:bg-slate-50",
        variant === "ghost" && "text-ink hover:bg-slate-100",
        className,
      )}
    >
      {solid && (
        // Signal yellow rises from the bottom edge on hover
        <span
          className="absolute inset-0 -z-10 translate-y-[101%] bg-signal transition-transform duration-500 ease-[var(--ease-out-expo)] group-enabled/btn:group-hover/btn:translate-y-0"
          aria-hidden
        />
      )}
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="font-mono text-[11px] font-medium uppercase leading-5 tracking-[0.1em] text-slate-500">
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
        <p id={`${id}-err`} className="animate-fade-up text-[13px] font-medium text-red-600" role="alert">{error}</p>
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
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cx(inputClass(), SELECT_CHEVRON, "cursor-pointer appearance-none pr-10")}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div data-reveal className={cx("rounded-[var(--radius-card)] border border-slate-200/80 bg-white shadow-[var(--shadow-card)]", className)}>
      {children}
    </div>
  );
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
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium transition-colors",
        done ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-ink",
        focus,
      )}
      aria-label={`Copy ${label ?? value}`}
      title={`Copy ${label ?? value}`}
    >
      {done ? <CheckIcon width={14} height={14} className="animate-pop-in" /> : <CopyIcon width={14} height={14} />}
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
      className={cx(
        "inline-flex h-9 items-center gap-1.5 rounded-full border bg-white px-3.5 text-[13.5px] font-medium shadow-[var(--shadow-card)] transition-all hover:-translate-y-px",
        done ? "border-brand-300 text-brand-700" : "border-slate-200 text-slate-700 hover:border-ink hover:text-ink",
        focus,
      )}
    >
      {done ? <CheckIcon width={15} height={15} /> : <ShareIcon width={15} height={15} />} {done ? "Link copied" : "Share"}
    </button>
  );
}

const KIND_STYLE: Record<TimeValue["kind"], string> = {
  scheduled: "bg-slate-100 text-slate-500 ring-slate-200",
  estimated: "bg-amber-50 text-amber-700 ring-amber-200/70",
  actual: "bg-brand-50 text-brand-700 ring-brand-200/70",
};
const KIND_LABEL: Record<TimeValue["kind"], string> = { scheduled: "Sched", estimated: "Est", actual: "Actual" };

/** A time with a small tag saying whether it's scheduled, estimated or actual. */
export function TimeTag({ t, timeZone, size = "md" }: { t?: TimeValue; timeZone?: string; size?: "md" | "lg" }) {
  if (!t) return <span className="font-mono text-slate-300">--:--</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx("font-mono font-semibold tabular-nums tracking-tight text-ink", size === "lg" ? "text-2xl" : "text-[15px]")}>{fmtTime(t, timeZone)}</span>
      <span className={cx("rounded-[5px] px-1.5 py-px font-mono text-[9.5px] font-semibold uppercase tracking-wider ring-1 ring-inset", KIND_STYLE[t.kind])} title={`${t.kind} time`}>
        {KIND_LABEL[t.kind]}
      </span>
    </span>
  );
}

const TONES = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-brand-50 text-brand-800 ring-brand-200/80",
  amber: "bg-amber-50 text-amber-800 ring-amber-200/80",
  red: "bg-red-50 text-red-700 ring-red-200/80",
  blue: "bg-sky-50 text-sky-800 ring-sky-200/80",
  violet: "bg-violet-50 text-violet-700 ring-violet-200/80",
};
const DOTS = {
  slate: "bg-slate-400",
  green: "bg-brand-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-sky-500",
  violet: "bg-violet-500",
};

/** Status chip with a coloured dot; in-motion tones (blue, violet) pulse */
export function Pill({ tone = "slate", children, className, dot = true }: { tone?: keyof typeof TONES; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12.5px] font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {dot && (
        <span className="relative flex size-1.5" aria-hidden>
          {(tone === "blue" || tone === "violet") && <span className={cx("absolute inset-0 animate-ping rounded-full opacity-60", DOTS[tone])} />}
          <span className={cx("relative size-1.5 rounded-full", DOTS[tone])} />
        </span>
      )}
      {children}
    </span>
  );
}

/** Segmented control with a sliding thumb */
export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const { ref, box } = useIndicator<HTMLDivElement>(value);
  return (
    <div ref={ref} role="tablist" aria-label={label} className="relative inline-flex rounded-full bg-slate-100 p-1 ring-1 ring-inset ring-slate-200/70">
      {box && (
        <span
          className="absolute inset-y-1 rounded-full bg-ink shadow-[0_4px_12px_-4px_rgb(11_13_16/0.5)] transition-[left,width] duration-500 ease-[var(--ease-out-expo)]"
          style={{ left: box.left, width: box.width }}
          aria-hidden
        />
      )}
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "relative rounded-full px-4 py-1.5 text-[14px] font-medium transition-colors duration-300",
            focus,
            value === t.value ? (box ? "text-white" : "bg-ink text-white") : "text-slate-500 hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
