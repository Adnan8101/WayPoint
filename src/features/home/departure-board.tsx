"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CancelledTrains } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { cx } from "@/lib/format";
import { SplitFlap } from "@/components/motion";
import { LocalClock } from "@/components/local-clock";

type Mode = "full" | "partial";
const NAME_LEN = 15;
const PAGE = 6;
const REQ = { url: "/api/trains/cancelled" };

const shortName = (n: string) => n.toUpperCase().replace(/\(.*?\)/g, "").replace(/\bEXPRESS\b|\bEXP\b/g, "").replace(/\s+/g, " ").trim();

/** Split-flap board of today's live cancellations, paging through the whole list */
export function DepartureBoard() {
  const { state } = useApi<CancelledTrains>(REQ);
  const [mode, setMode] = useState<Mode>("full");
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  const all = state.status === "success" ? state.data.trains : [];
  const list = useMemo(() => all.filter((t) => (mode === "partial") === t.partial), [all, mode]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));

  // Flip to the next page, then the other list, on a loop
  useEffect(() => {
    if (paused || state.status !== "success") return;
    const t = setTimeout(() => {
      if (page + 1 < pages) setPage(page + 1);
      else {
        setPage(0);
        setMode((m) => (m === "full" ? "partial" : "full"));
      }
    }, 7000);
    return () => clearTimeout(t);
  }, [page, pages, paused, state.status]);

  const rows = list.slice(page * PAGE, page * PAGE + PAGE);
  const filler = Array.from({ length: PAGE - rows.length }, (_, i) => i);
  const counts = state.status === "success" ? { full: state.data.fullCount, partial: state.data.partialCount } : undefined;
  const status = state.status === "loading" ? "LOADING" : state.status === "error" ? "UNAVAILABLE" : list.length === 0 ? "NONE TODAY" : "";

  return (
    <div
      className="relative rounded-[22px] bg-[#0f1216] p-1.5 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06),0_0_0_1px_rgb(255_255_255/0.06)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"].map((p) => (
        <span key={p} className={cx("absolute size-1.5 rounded-full bg-white/10 shadow-[inset_0_1px_1px_rgb(0_0_0/0.8)]", p)} aria-hidden />
      ))}
      <div className="rounded-[18px] border border-white/[0.04] bg-[#121519] px-5 pb-4 pt-4">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-1 rounded-full bg-black/40 p-0.5" role="tablist" aria-label="Cancellations">
            {(["full", "partial"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => { setMode(m); setPage(0); }}
                className={cx(
                  "rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                  mode === m ? "bg-signal text-ink" : "text-white/40 hover:text-white/80",
                )}
              >
                {m === "full" ? "Cancelled" : "Partial"}{counts ? ` ${counts[m]}` : ""}
              </button>
            ))}
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">
            <span className="text-signal"><LocalClock /></span>
          </p>
        </div>

        <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
          <span>Train</span>
          <span>Service</span>
          <span className="text-right">Check</span>
        </div>

        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <li key={`${r.trainNumber}-${r.startDate}`}>
              <Link href={`/train-status?train=${r.trainNumber}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 rounded-lg py-1 transition-colors hover:bg-white/[0.03]">
                <SplitFlap text={r.trainNumber} length={5} tileClassName="h-7 w-[19px] text-[15px] font-bold text-signal" />
                <SplitFlap text={shortName(r.trainName)} length={NAME_LEN} className="overflow-hidden" tileClassName="h-7 w-[17px] text-[14px] font-medium text-white/90" />
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 transition-colors group-hover:text-signal">
                  Status
                  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    <path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
          {filler.map((i) => (
            <li key={`f${i}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 py-1" aria-hidden>
              <SplitFlap text="" length={5} tileClassName="h-7 w-[19px] text-[15px] text-white/20" />
              <SplitFlap text={i === 0 ? status : ""} length={NAME_LEN} className="overflow-hidden" tileClassName="h-7 w-[17px] text-[14px] font-medium text-white/40" />
              <span className="w-[62px]" />
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/30">
          <span className="flex items-center gap-2">
            <span className="size-1.5 animate-blink rounded-full bg-signal" aria-hidden /> Live from Indian Railways
          </span>
          <span className="flex gap-1" aria-hidden>
            {Array.from({ length: Math.min(pages, 8) }, (_, i) => (
              <span key={i} className={cx("h-1 rounded-full transition-all duration-500", page === i ? "w-5 bg-signal" : "w-1.5 bg-white/20")} />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}
