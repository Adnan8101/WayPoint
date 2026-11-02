"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx, fmtDate } from "@/lib/format";
import { todayLocal } from "@/lib/dates";
import { FieldLabel } from "./ui";
import { Portal, useAnchoredStyle } from "./floating";

/*
  Calendar date picker used for every date in the app.
  Values are "YYYY-MM-DD" strings, and all arithmetic runs in UTC so a date
  never shifts with the viewer's time zone.
*/

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parts = (v: string) => v.split("-").map(Number) as [number, number, number];
const addDays = (v: string, n: number) => {
  const [y, m, d] = parts(v);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** Months since year 0, so months compare as plain numbers */
const monthIndex = (v: string) => {
  const [y, m] = parts(v);
  return y * 12 + (m - 1);
};
const fromMonthIndex = (i: number) => ({ y: Math.floor(i / 12), m: i % 12 });

function relativeLabel(v: string, today: string): string | undefined {
  const diff = Math.round((Date.parse(v) - Date.parse(today)) / 86_400_000);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : undefined;
}

export interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Allows clearing back to an empty value */
  optional?: boolean;
  placeholder?: string;
  /** Start of a range (e.g. departure when picking a return): days between are banded */
  rangeStart?: string;
}

export function DateField({ id, label, value, onChange, min, max, error, hint, className, optional, placeholder = "Add date", rangeStart }: DateFieldProps) {
  const today = todayLocal();
  const anchor = value || rangeStart || (min && min > today ? min : today);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => monthIndex(anchor));
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [focus, setFocus] = useState(anchor);
  const [hover, setHover] = useState<string>();
  const [wide, setWide] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const anchored = useAnchoredStyle(open && wide, triggerRef, popRef);

  const months = wide ? 2 : 1;
  const minM = min ? monthIndex(min) : -Infinity;
  const maxM = max ? monthIndex(max) : Infinity;
  const canPrev = view > minM;
  const canNext = view + months - 1 < maxM;
  const disabled = (d: string) => Boolean((min && d < min) || (max && d > max));

  const openPicker = () => {
    const isWide = window.matchMedia("(min-width: 640px)").matches;
    setWide(isWide);
    const start = monthIndex(anchor);
    // Show the anchor month, but keep the window inside the allowed range
    setView(isWide && start >= maxM && start - 1 >= minM ? start - 1 : start);
    setFocus(anchor);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    setHover(undefined);
    if (refocus) triggerRef.current?.focus();
  };
  const pick = (d: string) => {
    if (disabled(d)) return;
    onChange(d);
    close();
  };
  const shift = (n: number) => {
    setDir(n > 0 ? "next" : "prev");
    setView((v) => v + n);
  };

  // Close on outside press
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !popRef.current?.contains(t)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the roving focus on the matching day button
  useEffect(() => {
    if (open) gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focus}"]`)?.focus();
  }, [open, focus, view]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") return close();
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next: string | undefined;
    if (e.key in step) next = addDays(focus, step[e.key]);
    else if (e.key === "PageUp") next = addDays(focus, -30);
    else if (e.key === "PageDown") next = addDays(focus, 30);
    else return;
    e.preventDefault();
    if (min && next < min) next = min;
    if (max && next > max) next = max;
    const m = monthIndex(next);
    if (m < view) shift(m - view);
    else if (m > view + months - 1) shift(m - (view + months - 1));
    setFocus(next);
  };

  const rel = value ? relativeLabel(value, today) : undefined;
  const bandEnd = value || (rangeStart ? hover : undefined);
  const inBand = (d: string) => Boolean(rangeStart && bandEnd && d > rangeStart && d < bandEnd);
  const quick = [
    { label: "Today", v: today },
    { label: "Tomorrow", v: addDays(today, 1) },
    { label: "In a week", v: addDays(today, 7) },
  ].filter((q) => !disabled(q.v));

  return (
    <div ref={rootRef} className={cx("relative flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        onClick={() => (open ? close() : openPicker())}
        className={cx(
          "group flex h-12 w-full items-center gap-3 rounded-[14px] border bg-slate-50 px-4 text-left text-[15.5px] shadow-[inset_0_1px_2px_rgb(29_22_12/0.05)] transition-[border-color,box-shadow,background-color] duration-200 focus:outline-none",
          error
            ? "border-red-400 bg-red-50/40"
            : open
              ? "border-ink bg-white shadow-[0_0_0_4px_rgb(255_194_26/0.35)]"
              : "border-slate-200 hover:border-slate-300 hover:bg-white focus-visible:border-ink focus-visible:shadow-[0_0_0_4px_rgb(255_194_26/0.35)]",
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className={cx("shrink-0 transition-colors", open ? "text-ink" : "text-slate-400 group-hover:text-ink")}>
          <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        <span className="min-w-0 flex-1 truncate">
          {value ? (
            <span className="font-medium text-ink">{fmtDate(value, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        {rel && <span className="shrink-0 rounded-full bg-signal-soft px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800">{rel}</span>}
      </button>

      {open && (
        <Portal>
          {!wide && <div className="fixed inset-0 z-[60] animate-[fade-in_.3s] bg-ink/45 backdrop-blur-[2px]" aria-hidden />}
          <div
            ref={popRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            onKeyDown={onKey}
            style={wide ? anchored : undefined}
            className={cx(
              "z-[70] overflow-y-auto overscroll-contain bg-white text-ink shadow-[0_30px_80px_-20px_rgb(11_13_16/0.45),0_0_0_1px_rgb(11_13_16/0.06)]",
              wide
                ? cx("animate-pop-in rounded-[28px] p-7", months === 2 ? "w-[min(720px,calc(100vw-2rem))]" : "w-[380px]")
                : "fixed inset-x-0 bottom-0 max-h-[88dvh] animate-[sheet-up_.4s_var(--ease-out-expo)] rounded-t-[28px] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3",
            )}
          >
            {!wide && <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-slate-200" aria-hidden />}
            <p id={titleId} className="sr-only">Choose {label.toLowerCase()}</p>

            <div className="relative">
              <NavButton side="left" disabled={!canPrev} onClick={() => shift(-1)} />
              <NavButton side="right" disabled={!canNext} onClick={() => shift(1)} />
              <div ref={gridRef} key={view} className={cx("grid gap-8", months === 2 && "grid-cols-2", dir === "next" ? "animate-[cal-next_.35s_var(--ease-out-expo)]" : "animate-[cal-prev_.35s_var(--ease-out-expo)]")}>
                {Array.from({ length: months }, (_, i) => {
                  const { y, m } = fromMonthIndex(view + i);
                  return (
                    <Month
                      key={i}
                      y={y}
                      m={m}
                      value={value}
                      today={today}
                      focus={focus}
                      rangeStart={rangeStart}
                      bandEnd={bandEnd}
                      disabled={disabled}
                      inBand={inBand}
                      onPick={pick}
                      onHover={setHover}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <div className="flex flex-wrap gap-1.5">
                {quick.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => pick(q.v)}
                    className={cx(
                      "rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all hover:-translate-y-px",
                      value === q.v ? "border-ink bg-ink text-white" : "border-slate-200 text-slate-700 hover:border-ink",
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                {optional && value && (
                  <button type="button" onClick={() => { onChange(""); close(); }} className="text-[14px] font-semibold text-ink underline underline-offset-4 hover:text-slate-600">
                    Clear date
                  </button>
                )}
                <button type="button" onClick={() => close()} className="rounded-xl bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-carbon-700">
                  Done
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {error ? (
        <p id={`${id}-err`} className="animate-fade-up text-[13px] font-medium text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function NavButton({ side, disabled, onClick }: { side: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Previous month" : "Next month"}
      className={cx(
        "absolute -top-1.5 z-10 grid size-9 place-items-center rounded-full transition-all hover:bg-slate-100 active:scale-90 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent",
        side === "left" ? "-left-1.5" : "-right-1.5",
      )}
    >
      <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden className={side === "left" ? "rotate-90" : "-rotate-90"}>
        <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function Month({
  y, m, value, today, focus, rangeStart, bandEnd, disabled, inBand, onPick, onHover,
}: {
  y: number; m: number; value: string; today: string; focus: string; rangeStart?: string; bandEnd?: string;
  disabled: (d: string) => boolean; inBand: (d: string) => boolean; onPick: (d: string) => void; onHover: (d?: string) => void;
}) {
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const title = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m, 1)));

  return (
    <div onMouseLeave={() => onHover(undefined)}>
      <p className="mb-4 text-center text-[16px] font-semibold">{title}</p>
      <div className="grid grid-cols-7 text-center font-mono text-[11px] font-medium text-slate-400">
        {WEEKDAYS.map((w) => <span key={w} className="pb-2">{w}</span>)}
      </div>
      <div role="grid" aria-label={title} className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const d = iso(y, m, i + 1);
          const off = disabled(d);
          const selected = d === value;
          const isStart = rangeStart === d;
          const band = inBand(d);
          // Band continues from the start cell to the end cell, Airbnb-style
          const bandLeft = band || (bandEnd && d === bandEnd && rangeStart && rangeStart < d);
          const bandRight = band || (isStart && bandEnd && bandEnd > d);
          return (
            <div key={d} className="relative flex h-11 items-center justify-center">
              {(bandLeft || bandRight) && (
                <span className={cx("absolute inset-y-0 bg-slate-100", bandLeft && bandRight ? "inset-x-0" : bandLeft ? "left-0 right-1/2" : "left-1/2 right-0")} aria-hidden />
              )}
              <button
                type="button"
                data-date={d}
                tabIndex={d === focus ? 0 : -1}
                disabled={off}
                aria-pressed={selected}
                aria-label={fmtDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                onClick={() => onPick(d)}
                onMouseEnter={() => !off && onHover(d)}
                className={cx(
                  "relative grid size-11 place-items-center rounded-full text-[14px] font-medium transition-[box-shadow,background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2",
                  off && "cursor-not-allowed text-slate-300 line-through decoration-slate-300",
                  !off && !selected && "text-ink hover:shadow-[inset_0_0_0_1.5px_var(--color-ink)] active:scale-95",
                  selected && "bg-ink font-semibold text-white shadow-[0_6px_14px_-6px_rgb(11_13_16/0.7)]",
                  isStart && !selected && "bg-white shadow-[inset_0_0_0_2px_var(--color-ink)] font-semibold",
                )}
              >
                {i + 1}
                {d === today && <span className={cx("absolute bottom-1.5 size-1 rounded-full", selected ? "bg-signal" : "bg-amber-500")} aria-hidden />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
