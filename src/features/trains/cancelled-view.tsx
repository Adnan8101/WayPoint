"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ApiMeta, CancelledTrains } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { cx, fmtDate } from "@/lib/format";
import { Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, Pill, Tabs, inputClass } from "@/components/ui";
import { ArrowRightIcon, SearchIcon } from "@/components/icons";

const REQ = { url: "/api/trains/cancelled" };

export function CancelledView() {
  const { state, refresh } = useApi<CancelledTrains>(REQ);
  return (
    <Section className="relative -mt-20">
      <ApiResult state={state} onRetry={refresh} skeleton={<ResultSkeleton rows={8} />}>
        {(d, meta, refreshing) => <List d={d} meta={meta} refreshing={refreshing} refresh={refresh} />}
      </ApiResult>
    </Section>
  );
}

function List({ d, meta, refreshing, refresh }: { d: CancelledTrains; meta: ApiMeta; refreshing: boolean; refresh: () => void }) {
  const [kind, setKind] = useState<"all" | "full" | "partial">("all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return d.trains
      .filter((t) => kind === "all" || (kind === "partial") === t.partial)
      .filter((t) => !s || `${t.trainNumber} ${t.trainName} ${t.source} ${t.destination} ${t.cancelledFrom ?? ""} ${t.cancelledTo ?? ""}`.toLowerCase().includes(s));
  }, [d.trains, kind, q]);

  return (
    <div className="space-y-6">
      <div data-reveal className="grid gap-px overflow-hidden rounded-[24px] bg-slate-200/80 shadow-[var(--shadow-pop)] sm:grid-cols-3">
        {[
          ["Cancelled today", d.fullCount + d.partialCount, "text-ink"],
          ["Fully cancelled", d.fullCount, "text-red-600"],
          ["Partially cancelled", d.partialCount, "text-amber-600"],
        ].map(([label, n, tone], i) => (
          <div key={label as string} className={cx("p-6", i === 0 ? "grain relative bg-ink text-white" : "bg-white")}>
            <p className={cx("label", i === 0 && "!text-signal")}>{label}</p>
            <p className={cx("font-display mt-2 text-[56px] font-bold leading-none", i === 0 ? "text-white" : (tone as string))}>{n}</p>
            {i === 0 && d.date && <p className="mt-2 text-[13px] text-white/55">{fmtDate(d.date, { weekday: "long", day: "numeric", month: "long" })}</p>}
          </div>
        ))}
      </div>

      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={60 * 60_000} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs label="Cancellation type" value={kind} onChange={setKind} tabs={[{ value: "all", label: "All" }, { value: "full", label: "Fully" }, { value: "partial", label: "Partially" }]} />
        <label className="relative sm:w-80">
          <span className="sr-only">Search cancelled trains</span>
          <SearchIcon width={17} height={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Is my train on this list?" className={cx(inputClass(), "pl-11")} />
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={q ? "Not on today's list" : "No cancellations here"}>
          {q ? "No cancelled train matches that. If you're travelling today, check its live running status too." : "Nothing in this category today."}
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {rows.map((t, i) => (
              <li key={`${t.trainNumber}-${t.startDate}`} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                <Link href={`/train-status?train=${t.trainNumber}`} className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-slate-50">
                  <span className={cx("h-10 w-1 shrink-0 rounded-full", t.partial ? "bg-amber-400" : "hazard")} aria-hidden />
                  <span className="rounded-md bg-ink px-2 py-1 font-mono text-[13px] font-bold text-signal">{t.trainNumber}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{t.trainName}</span>
                    <span className="block truncate text-[13px] text-slate-500">{t.source} → {t.destination}{t.trainType ? ` · ${t.trainType.toLowerCase()}` : ""}</span>
                  </span>
                  {t.partial ? (
                    <Pill tone="amber">Cancelled {t.cancelledFrom} → {t.cancelledTo}</Pill>
                  ) : (
                    <Pill tone="red">Fully cancelled</Pill>
                  )}
                  <ArrowRightIcon width={16} height={16} className="hidden text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-ink sm:block" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-[12.5px] text-slate-500">From Indian Railways&apos; daily cancellation list. Partially cancelled trains don&apos;t run between the stations shown. Diversions and reschedulings aren&apos;t included.</p>
    </div>
  );
}
