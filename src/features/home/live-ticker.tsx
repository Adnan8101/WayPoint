"use client";

import Link from "next/link";
import type { CancelledTrains } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { BanIcon, TrainIcon } from "@/components/icons";

const REQ = { url: "/api/trains/cancelled" };

/** Signal-yellow band scrolling today's live cancellations */
export function LiveTicker() {
  const { state } = useApi<CancelledTrains>(REQ);
  const trains = state.status === "success" ? state.data.trains : [];

  return (
    <div className="relative flex h-[52px] items-center overflow-hidden border-y border-ink/10 bg-signal text-ink">
      <Link
        href="/cancelled-trains"
        className="relative z-10 flex h-full shrink-0 items-center gap-2 bg-ink px-4 font-mono text-[11.5px] font-bold uppercase tracking-[0.14em] text-signal transition-colors hover:bg-carbon-800 sm:px-6"
      >
        <BanIcon width={15} height={15} />
        {state.status === "success" ? `${state.data.fullCount + state.data.partialCount} cancelled today` : "Cancellations"}
      </Link>
      {trains.length > 0 ? (
        <div className="flex w-max animate-marquee gap-10 pl-6 hover:[animation-play-state:paused]" style={{ animationDuration: `${Math.max(40, trains.length * 3)}s` }} aria-hidden>
          {[...trains, ...trains].map((t, i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap">
              <TrainIcon width={16} height={16} />
              <span className="font-mono text-[14px] font-bold tracking-wider">{t.trainNumber}</span>
              <span className="text-[14px] font-medium text-ink/70">{t.trainName}</span>
              <span className="rounded-full bg-ink/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase">
                {t.partial ? `Part · ${t.cancelledFrom ?? ""}→${t.cancelledTo ?? ""}` : "Cancelled"}
              </span>
              <span className="ml-6 size-1.5 rotate-45 bg-ink/40" />
            </span>
          ))}
        </div>
      ) : (
        <p className="pl-6 font-mono text-[12px] uppercase tracking-[0.14em] text-ink/60">
          {state.status === "error" ? "Live cancellations are unavailable right now" : state.status === "success" ? "No cancellations reported today" : "Loading live cancellations…"}
        </p>
      )}
    </div>
  );
}
