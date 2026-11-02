"use client";

import Link from "next/link";
import { clearRecent, useRecent, type RecentKind } from "@/lib/client/recent";
import { fmtRelative } from "@/lib/format";
import { ArrowRightIcon, ClockIcon } from "./icons";

const KIND_LABEL: Record<RecentKind, string> = {
  flight: "Flight",
  tracker: "Tracker",
  "flight-search": "Flights",
  airport: "Airport",
  pnr: "PNR",
  train: "Train",
  between: "Route",
  schedule: "Schedule",
  route: "Route map",
  station: "Station",
  seats: "Seats",
  vacancy: "Berths",
  planner: "Plan",
};

export function RecentList({ kinds, title = "Recent searches" }: { kinds?: RecentKind[]; title?: string }) {
  const items = useRecent(kinds);
  return (
    <div className="h-full rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-ink text-signal"><ClockIcon width={16} height={16} /></span> {title}
        </h2>
        {items.length > 0 && (
          <button type="button" onClick={clearRecent} className="rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600">
            Clear
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5">
          <div className="flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((n) => <span key={n} className="h-2 rounded-full bg-slate-200" style={{ width: `${48 - n * 12}%` }} />)}
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-slate-500">Your searches appear here so you can repeat them in one tap. They stay on this device.</p>
        </div>
      ) : (
        <ul className="-mx-2 mt-4 space-y-0.5">
          {items.slice(0, 7).map((i, n) => (
            <li key={i.href} className="animate-fade-up" style={{ animationDelay: `${n * 40}ms` }}>
              <Link href={i.href} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-100">
                <span className="w-[68px] shrink-0 rounded-md bg-slate-100 px-1.5 py-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-600 transition-colors group-hover:bg-ink group-hover:text-signal">{KIND_LABEL[i.kind]}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{i.label}</span>
                <span className="font-mono text-[11px] text-slate-400 group-hover:hidden">{fmtRelative(new Date(i.at).toISOString())}</span>
                <ArrowRightIcon width={15} height={15} className="hidden text-ink group-hover:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
