"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CancelledTrain, CancelledTrains } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { cx, fmtDate } from "@/lib/format";
import { SplitFlap } from "@/components/motion";

type Mode = "full" | "partial";
const PAGE = 6;
const REQ = { url: "/api/trains/cancelled" };
const REFRESH_MS = 5 * 60_000;

/** "C Shivaji Mah T" stays as the railway prints it; just tidy spacing */
const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

function Route({ t }: { t: CancelledTrain }) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-[14px] font-medium text-white/90">
      <span className="truncate">{tidy(t.source) || "—"}</span>
      <span className="shrink-0 text-signal" aria-label="to">→</span>
      <span className="truncate">{tidy(t.destination) || "—"}</span>
    </span>
  );
}

function Status({ t }: { t: CancelledTrain }) {
  return t.partial ? (
    <span className="shrink-0 rounded-md bg-amber-400/15 px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-400/30" title={`Not running ${t.cancelledFrom ?? ""} to ${t.cancelledTo ?? ""}`}>
      Part{t.cancelledFrom && t.cancelledTo ? ` · ${t.cancelledFrom}–${t.cancelledTo}` : ""}
    </span>
  ) : (
    <span className="shrink-0 rounded-md bg-red-500/15 px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-red-300 ring-1 ring-inset ring-red-400/30">Cancelled</span>
  );
}

/** Split-flap board of today's live cancellations from Indian Railways, paging through the list */
export function DepartureBoard() {
  const { state, refresh } = useApi<CancelledTrains>(REQ);
  const [mode, setMode] = useState<Mode>("full");
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  // Keep it current while the page stays open
  useEffect(() => {
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const data = state.status === "success" ? state.data : state.status === "loading" ? state.previous?.data : undefined;
  const fetchedAt = state.status === "success" ? state.meta.fetchedAt : state.status === "loading" ? state.previous?.meta.fetchedAt : undefined;
  const list = useMemo(() => (data?.trains ?? []).filter((t) => (mode === "partial") === t.partial), [data, mode]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));

  // Flip to the next page, then the other list, on a loop
  useEffect(() => {
    if (paused || !data) return;
    const t = setTimeout(() => {
      if (page + 1 < pages) setPage(page + 1);
      else {
        setPage(0);
        setMode((m) => (m === "full" ? "partial" : "full"));
      }
    }, 7000);
    return () => clearTimeout(t);
  }, [page, pages, paused, data]);

  const rows = list.slice(page * PAGE, page * PAGE + PAGE);
  const filler = Array.from({ length: PAGE - rows.length }, (_, i) => i);
  const message = !data ? (state.status === "error" ? "Live data unavailable" : "Loading live data…") : list.length === 0 ? "None reported today" : "";
  const updated = fetchedAt ? new Date(fetchedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }) : undefined;

  return (
    <div
      className="relative w-[560px] max-w-full rounded-[22px] bg-[#0f1216] p-1.5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06),0_0_0_1px_rgb(255_255_255/0.06)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"].map((p) => (
        <span key={p} className={cx("absolute size-1.5 rounded-full bg-white/10 shadow-[inset_0_1px_1px_rgb(0_0_0/0.8)]", p)} aria-hidden />
      ))}
      <div className="rounded-[18px] border border-white/[0.04] bg-[#121519] px-5 pb-4 pt-4">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
          <div>
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/40">Indian Railways · today</p>
            <p className="mt-0.5 text-[15px] font-semibold text-white">Cancelled trains</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-black/40 p-0.5" role="tablist" aria-label="Cancellation type">
            {(["full", "partial"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setPage(0); }}
                className={cx(
                  "rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
                  mode === m ? "bg-signal text-ink" : "text-white/45 hover:text-white/80",
                )}
              >
                {m === "full" ? "Full" : "Partial"}
                {data && <span className={cx("ml-1.5", mode === m ? "text-ink/60" : "text-white/30")}>{m === "full" ? data.fullCount : data.partialCount}</span>}
              </button>
            ))}
          </div>
        </div>

        <ul className="mt-3 space-y-1">
          {rows.map((t) => (
            <li key={`${t.trainNumber}-${t.startDate}`}>
              <Link
                href={`/train-status?train=${t.trainNumber}`}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 rounded-lg px-1 py-1.5 transition-colors hover:bg-white/[0.04]"
                title={`${t.trainNumber} ${t.trainName}: check live status`}
              >
                <SplitFlap text={t.trainNumber} length={5} tileClassName="h-7 w-[19px] text-[15px] font-bold text-signal" />
                <span className="min-w-0">
                  <Route t={t} />
                  <span className="block truncate font-mono text-[10.5px] uppercase tracking-wider text-white/35">{tidy(t.trainName)}</span>
                </span>
                <Status t={t} />
              </Link>
            </li>
          ))}
          {filler.map((i) => (
            <li key={`f${i}`} className="grid h-[46px] grid-cols-[auto_1fr] items-center gap-x-4 px-1" aria-hidden>
              <SplitFlap text="" length={5} tileClassName="h-7 w-[19px] text-[15px] text-white/20" />
              {i === 0 && message ? <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/40">{message}</span> : <span className="h-2 w-2/3 rounded-full bg-white/[0.04]" />}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/35">
          <span className="flex items-center gap-2">
            <span className="size-1.5 animate-blink rounded-full bg-signal" aria-hidden />
            {updated ? `Updated ${updated}` : "Live"}
            {data?.date && <span className="text-white/25">· list for {fmtDate(data.date, { day: "numeric", month: "short" })}</span>}
          </span>
          <span className="flex items-center gap-1" aria-label={`Page ${page + 1} of ${pages}`}>
            {Array.from({ length: Math.min(pages, 8) }, (_, i) => (
              <span key={i} className={cx("h-1 rounded-full transition-all duration-500", page === i ? "w-5 bg-signal" : "w-1.5 bg-white/20")} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
