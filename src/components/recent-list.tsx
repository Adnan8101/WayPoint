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
};

export function RecentList({ kinds, title = "Recent searches" }: { kinds?: RecentKind[]; title?: string }) {
  const items = useRecent(kinds);
  return (
    <div className="h-full rounded-[var(--radius-card)] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <ClockIcon width={17} height={17} className="text-slate-400" /> {title}
        </h2>
        {items.length > 0 && (
          <button type="button" onClick={clearRecent} className="rounded-md px-2 py-1 text-[12.5px] font-medium text-slate-500 hover:bg-slate-100 hover:text-ink">
            Clear
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-[14px] leading-relaxed text-slate-500">Your searches appear here so you can repeat them in one tap. They stay on this device.</p>
      ) : (
        <ul className="-mx-2 mt-3">
          {items.slice(0, 7).map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
                <span className="w-16 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-center text-[11.5px] font-medium text-slate-600">{KIND_LABEL[i.kind]}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">{i.label}</span>
                <span className="text-[12px] text-slate-400 group-hover:hidden">{fmtRelative(new Date(i.at).toISOString())}</span>
                <ArrowRightIcon width={15} height={15} className="hidden text-slate-400 group-hover:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
