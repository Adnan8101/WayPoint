"use client";

import { useEffect, useState } from "react";
import type { ApiMeta, ErrorCode } from "@/lib/types";
import { cx, fmtDateTime, fmtRelative } from "@/lib/format";
import { AlertIcon, RefreshIcon, SearchIcon } from "./icons";
import { Button } from "./ui";

const ERROR_TITLES: Record<ErrorCode, string> = {
  INVALID_FLIGHT: "We couldn't find that flight",
  INVALID_TRAIN: "We couldn't find that train",
  INVALID_PNR: "That PNR didn't work",
  INVALID_STATION: "We don't recognise that station",
  INVALID_AIRPORT: "We don't recognise that airport",
  INVALID_INPUT: "Let's fix the search",
  NO_RESULTS: "Nothing found",
  UNAVAILABLE: "Live information isn't available right now",
  NOT_CONFIGURED: "Live information isn't available right now",
  SERVICE_FAILURE: "Unable to retrieve data right now",
  TIMEOUT: "That took too long",
  RATE_LIMITED: "Too many searches at once",
};

const RETRYABLE = new Set<ErrorCode>(["UNAVAILABLE", "SERVICE_FAILURE", "TIMEOUT", "RATE_LIMITED", "NOT_CONFIGURED"]);

export function ErrorState({ code, message, onRetry }: { code: ErrorCode; message: string; onRetry?: () => void }) {
  const isInput = code.startsWith("INVALID") || code === "NO_RESULTS";
  return (
    <div role="alert" className="animate-fade-up relative flex flex-col gap-4 overflow-hidden rounded-[var(--radius-card)] border border-slate-200/80 bg-white p-5 pl-6 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:p-6 sm:pl-7">
      <span className={cx("absolute inset-y-0 left-0 w-1", isInput ? "bg-amber-400" : "hazard")} aria-hidden />
      <span className={cx("grid size-12 shrink-0 place-items-center rounded-2xl", isInput ? "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/70" : "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200/70")}>
        {code === "NO_RESULTS" ? <SearchIcon /> : <AlertIcon />}
      </span>
      <div className="flex-1">
        <h3 className="font-display text-[20px] font-semibold text-ink">{ERROR_TITLES[code]}</h3>
        <p className="mt-0.5 text-[14.5px] text-slate-600">{message}</p>
        {!isInput && (
          <p className="mt-1.5 text-[13px] text-slate-400">We only show verified data. We never guess or fill in gaps.</p>
        )}
      </div>
      {onRetry && RETRYABLE.has(code) && (
        <Button variant="secondary" onClick={onRetry} className="h-10 shrink-0">
          <RefreshIcon width={15} height={15} /> Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div data-reveal className="dot-field relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-dashed border-slate-300 bg-white/50 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-9">
      <div className="flex-1">
        <span className="relative grid size-14 place-items-center rounded-2xl bg-ink text-signal shadow-[0_10px_24px_-10px_rgb(11_13_16/0.6)]">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-signal/20 [animation-duration:2.4s]" aria-hidden />
          {icon ?? <SearchIcon />}
        </span>
        <h3 className="font-display mt-6 text-[26px] font-bold text-ink">{title}</h3>
        {children && <div className="mt-2 max-w-lg text-[15px] leading-relaxed text-slate-500">{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        "animate-shimmer rounded-lg bg-[linear-gradient(100deg,var(--color-slate-100)_30%,var(--color-slate-50)_50%,var(--color-slate-100)_70%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function ResultSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="relative space-y-4 overflow-hidden rounded-[var(--radius-card)] border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]" aria-busy="true" aria-label="Loading results">
      <span className="absolute inset-x-0 top-0 h-[3px] overflow-hidden" aria-hidden>
        <span className="block h-full w-1/3 animate-scan rounded-full bg-signal" />
      </span>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
      </div>
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    </div>
  );
}

/** Freshness bar with refresh. Flags data as outdated after `staleAfterMs`. */
export function Freshness({
  meta, onRefresh, refreshing, staleAfterMs = 10 * 60_000, providerLabel = "Last updated",
}: { meta: ApiMeta; onRefresh?: () => void; refreshing?: boolean; staleAfterMs?: number; providerLabel?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const reference = meta.providerUpdatedAt && !Number.isNaN(Date.parse(meta.providerUpdatedAt)) ? meta.providerUpdatedAt : meta.fetchedAt;
  const stale = now - Date.parse(reference) > staleAfterMs;

  return (
    <div className="space-y-2">
      <div className="animate-fade-up flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-full border border-slate-200/80 bg-white py-2 pl-4 pr-2 text-[13px] text-slate-500 shadow-[var(--shadow-card)]">
        <span className={cx("inline-flex items-center gap-1.5 font-medium", meta.live ? "text-brand-700" : "text-slate-600")}>
          <span className="relative flex size-2">
            {meta.live && !stale && <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />}
            <span className={cx("relative inline-flex size-2 rounded-full", meta.live ? (stale ? "bg-amber-500" : "bg-brand-500") : "bg-slate-400")} />
          </span>
          {meta.live ? "Live data" : "Timetable data"}
        </span>
        <span>Updated {fmtRelative(meta.fetchedAt, now)} <span className="text-slate-400">· {fmtDateTime(meta.fetchedAt)}</span></span>
        {meta.providerUpdatedAt && <span className="hidden sm:inline">{providerLabel} {fmtRelative(meta.providerUpdatedAt, now)}</span>}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-medium text-white transition-colors hover:bg-signal hover:text-ink disabled:opacity-50"
          >
            <RefreshIcon width={14} height={14} className={refreshing ? "animate-spin" : undefined} /> {refreshing ? "Refreshing" : "Refresh"}
          </button>
        )}
      </div>
      {stale && meta.live && (
        <p role="status" className="animate-fade-up flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[13.5px] text-amber-900 ring-1 ring-inset ring-amber-200/70">
          <AlertIcon width={15} height={15} /> This may be out of date. The last update was {fmtRelative(reference, now)}. Refresh for the latest.
        </p>
      )}
    </div>
  );
}

export function TimeLegend() {
  return (
    <p className="flex flex-wrap items-center gap-4 text-[12.5px] text-slate-500">
      <span className="inline-flex items-center gap-1.5"><span className="rounded bg-slate-100 px-1 text-[10px] font-semibold uppercase text-slate-500">Sched</span> Timetable</span>
      <span className="inline-flex items-center gap-1.5"><span className="rounded bg-amber-50 px-1 text-[10px] font-semibold uppercase text-amber-700">Est</span> Estimated</span>
      <span className="inline-flex items-center gap-1.5"><span className="rounded bg-brand-50 px-1 text-[10px] font-semibold uppercase text-brand-700">Actual</span> Live / reported</span>
    </p>
  );
}
