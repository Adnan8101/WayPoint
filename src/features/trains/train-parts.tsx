"use client";

import type { BookingStatusCode } from "@/lib/types";
import { cx } from "@/lib/format";
import { CopyButton, Pill } from "@/components/ui";

export const BOOKING_STATUS_INFO: Record<Exclude<BookingStatusCode, "OTHER">, { label: string; tone: "green" | "amber" | "red" | "blue" | "slate" }> = {
  CNF: { label: "Confirmed", tone: "green" },
  RAC: { label: "Reservation Against Cancellation", tone: "blue" },
  WL: { label: "Waiting List", tone: "amber" },
  GNWL: { label: "General Waiting List", tone: "amber" },
  RLWL: { label: "Remote Location Waiting List", tone: "amber" },
  PQWL: { label: "Pooled Quota Waiting List", tone: "amber" },
  TQWL: { label: "Tatkal Quota Waiting List", tone: "amber" },
  RSWL: { label: "Roadside Station Waiting List", tone: "amber" },
  CAN: { label: "Cancelled", tone: "red" },
};

export function BookingStatusPill({ code, text }: { code: BookingStatusCode; text: string }) {
  if (!text) return <span className="text-[13px] text-slate-400">Not provided</span>;
  const info = code === "OTHER" ? undefined : BOOKING_STATUS_INFO[code];
  return (
    <Pill tone={info?.tone ?? "slate"} className="font-mono">
      <span title={info?.label}>{text}</span>
    </Pill>
  );
}

export function TrainTitle({ number, name, sub }: { number: string; name: string; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-ink px-2.5 py-1 font-mono text-[15px] font-bold tracking-wider text-signal">{number}</span>
        <CopyButton value={number} label="train number" />
      </div>
      <h2 className="font-display mt-3 text-[32px] font-bold text-ink sm:text-[38px]">{name || "Train"}</h2>
      {sub && <div className="mt-1 text-[14.5px] text-slate-500">{sub}</div>}
    </div>
  );
}

export function RunDays({ days }: { days: string[] }) {
  const all = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  if (!days.length) return <span className="text-[12.5px] text-slate-400">Running days not reported</span>;
  return (
    <span className="inline-flex gap-1" aria-label={`Runs on ${days.length === 7 ? "all days" : days.join(", ")}`}>
      {all.map((d) => (
        <span
          key={d}
          title={d}
          className={cx("grid size-6 place-items-center rounded-md text-[11px] font-semibold", days.includes(d) ? "bg-ink text-signal" : "bg-slate-100 text-slate-300")}
        >
          {d[0]}
        </span>
      ))}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between text-[13px] text-slate-500"><span>{label}</span><span className="font-mono text-[15px] font-bold text-ink">{pct}%</span></div>
      <div className="relative h-2 rounded-full bg-[repeating-linear-gradient(90deg,var(--color-slate-200)_0_10px,var(--color-slate-100)_10px_14px)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-gradient-to-r from-ink to-carbon-700" style={{ width: `${pct}%` }} />
        <span className="absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-signal text-ink shadow-[0_0_0_4px_white,0_6px_18px_-4px_rgb(230_160_0/0.7)]" style={{ left: `${pct}%` }} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4" /></svg>
        </span>
      </div>
    </div>
  );
}
