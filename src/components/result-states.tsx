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
  SERVICE_FAILURE: "Our data source is having trouble",
  TIMEOUT: "That took too long",
  RATE_LIMITED: "Too many searches at once",
};

const RETRYABLE = new Set<ErrorCode>(["UNAVAILABLE", "SERVICE_FAILURE", "TIMEOUT", "RATE_LIMITED", "NOT_CONFIGURED"]);

export function ErrorState({ code, message, onRetry }: { code: ErrorCode; message: string; onRetry?: () => void }) {
  const isInput = code.startsWith("INVALID") || code === "NO_RESULTS";
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:p-6">
      <span className={cx("grid size-11 shrink-0 place-items-center rounded-xl", isInput ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600")}>
        {code === "NO_RESULTS" ? <SearchIcon /> : <AlertIcon />}
      </span>
      <div className="flex-1">
        <h3 className="text-[16.5px] font-semibold text-ink">{ERROR_TITLES[code]}</h3>
        <p className="mt-0.5 text-[14.5px] text-slate-600">{message}</p>
        {!isInput && (
          <p className="mt-1.5 text-[13px] text-slate-400">We only show what our data sources actually report. We never guess or fill in gaps.</p>
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
    <div className="flex h-full flex-col items-start rounded-[var(--radius-card)] border border-dashed border-slate-300 bg-white/60 p-6 sm:p-8">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon ?? <SearchIcon />}</span>
      <h3 className="mt-4 text-[18px] font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-lg text-[14.5px] leading-relaxed text-slate-500">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-slate-200/70", className)} />;
}

export function ResultSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-slate-200 bg-white p-6" aria-busy="true" aria-label="Loading results">
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

/** Data source and freshness bar with refresh. Flags data as outdated after `staleAfterMs`. */
export function Freshness({
  meta, onRefresh, refreshing, staleAfterMs = 10 * 60_000, providerLabel = "Provider update",
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-500">
        <span className={cx("inline-flex items-center gap-1.5 font-medium", meta.live ? "text-brand-700" : "text-slate-600")}>
          <span className="relative flex size-2">
            {meta.live && !stale && <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />}
            <span className={cx("relative inline-flex size-2 rounded-full", meta.live ? (stale ? "bg-amber-500" : "bg-brand-500") : "bg-slate-400")} />
          </span>
          {meta.live ? "Live data" : "Timetable data"}
        </span>
        <span>Updated {fmtRelative(meta.fetchedAt, now)} <span className="text-slate-400">· {fmtDateTime(meta.fetchedAt)}</span></span>
        {meta.providerUpdatedAt && <span className="hidden sm:inline">{providerLabel} {fmtRelative(meta.providerUpdatedAt, now)}</span>}
        <span className="hidden text-slate-400 md:inline">via {meta.source}</span>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium text-ink transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshIcon width={14} height={14} className={refreshing ? "animate-spin" : undefined} /> {refreshing ? "Refreshing" : "Refresh"}
          </button>
        )}
      </div>
      {stale && meta.live && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-[13.5px] text-amber-900">
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
