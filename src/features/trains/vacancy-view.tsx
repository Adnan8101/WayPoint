"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ApiMeta, ChartVacancy, VacantBerth } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { useStation } from "@/lib/client/lookups";
import { todayIST } from "@/lib/dates";
import { cx, fmtDate, fmtDateTime } from "@/lib/format";
import { VacancyForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { CopyButton, ShareButton } from "@/components/ui";
import { RecentList } from "@/components/recent-list";

export function VacancyView() {
  const params = useSearchParams();
  const q = { train: params.get("train") ?? "", boarding: params.get("boarding") ?? "", date: params.get("date") ?? "", class: params.get("class") ?? "ALL" };
  const ready = Boolean(q.train && q.boarding);
  const req = useMemo(
    () => (ready ? { url: `/api/trains/vacancy?${new URLSearchParams({ ...q, date: q.date || todayIST() })}` } : null),
    [ready, q.train, q.boarding, q.date, q.class], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const { state, refresh } = useApi<ChartVacancy>(req);

  useEffect(() => {
    if (state.status === "success") addRecent({ kind: "vacancy", label: `${q.train} · from ${q.boarding}`, href: `/chart-vacancy?${new URLSearchParams(q)}` });
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <SearchPanel>
        <VacancyForm key={params.toString()} initial={q} />
      </SearchPanel>
      <Section>
        <ApiResult
          state={state}
          onRetry={refresh}
          skeleton={<ResultSkeleton rows={6} />}
          idle={
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <EmptyState art="seats" title="Find a berth after the chart">
                Once the reservation chart is prepared, unsold and cancelled berths show up here, coach by coach, with the exact stretch each one is free for. Ask the ticket examiner on board for them.
              </EmptyState>
              <RecentList kinds={["vacancy"]} />
            </div>
          }
        >
          {(d, meta, refreshing) => <Result d={d} meta={meta} refreshing={refreshing} refresh={refresh} />}
        </ApiResult>
      </Section>
    </>
  );
}

function Result({ d, meta, refreshing, refresh }: { d: ChartVacancy; meta: ApiMeta; refreshing: boolean; refresh: () => void }) {
  const names = { from: useStation(d.from || undefined), to: useStation(d.to || undefined), boarding: useStation(d.boarding) };
  const classes = Object.entries(d.byClass).filter(([, n]) => n > 0).map(([c]) => c);
  const [cls, setCls] = useState("all");
  const coaches = useMemo(() => {
    const by = new Map<string, VacantBerth[]>();
    for (const b of d.berths) if (cls === "all" || b.travelClass === cls) by.set(b.coach, [...(by.get(b.coach) ?? []), b]);
    return [...by.entries()]
      .map(([coach, list]) => ({ coach, cls: list[0].travelClass, berths: list.sort((a, b) => a.berthNo - b.berthNo) }))
      .sort((a, b) => a.coach.localeCompare(b.coach, "en", { numeric: true }));
  }, [d.berths, cls]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-ink px-2.5 py-1 font-mono text-[15px] font-bold tracking-wider text-signal">{d.trainNumber}</span>
            <CopyButton value={d.trainNumber} label="train number" />
          </div>
          <h2 className="font-display mt-3 text-[30px] font-bold text-ink sm:text-[38px]">{d.trainName || `Train ${d.trainNumber}`}</h2>
          <p className="mt-1 text-[15px] text-slate-500">
            {d.from && d.to ? `${names.from?.name ?? d.from} → ${names.to?.name ?? d.to} · ` : ""}Boarding at {names.boarding?.name ?? d.boarding} on {fmtDate(d.date, { weekday: "short", day: "numeric", month: "short" })}
          </p>
        </div>
        <ShareButton title={`Vacant berths on ${d.trainNumber}`} />
      </div>
      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={5 * 60_000} providerLabel="Chart updated" />

      <div data-reveal className="grain relative overflow-hidden rounded-[24px] bg-ink p-6 text-white sm:p-8">
        <div className="glow-signal absolute inset-0" aria-hidden />
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <p className="label flex items-center gap-2 !text-signal">
              <span className={cx("size-2 rounded-full", d.chartPrepared ? "bg-brand-400" : "bg-amber-400")} />
              {d.chartPrepared ? `Chart prepared${d.chartPhase ? ` · ${d.chartPhase}` : ""}` : "Chart not prepared yet"}
            </p>
            <p className="font-display mt-3 text-[64px] font-bold leading-none sm:text-[80px]">{d.total}</p>
            <p className="mt-2 text-[15px] text-white/60">vacant berths {cls === "all" ? "across all classes" : `in ${cls}`}</p>
          </div>
          <div className="space-y-2 text-[13.5px] text-white/65 md:text-right">
            {d.chartTime && <p>Charted {fmtDateTime(new Date(`${d.chartTime.replace(" ", "T")}+05:30`).toISOString())}</p>}
            {d.nextRemoteStation && <p>Next chart at <span className="font-mono font-semibold text-signal">{d.nextRemoteStation}</span>, where more berths may open up</p>}
          </div>
        </div>
        {classes.length > 0 && (
          <dl className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/[0.08] sm:grid-cols-5">
            {Object.entries(d.byClass).map(([c, n]) => (
              <div key={c} className="bg-ink/85 p-4">
                <dt className="label !text-white/40">{c}</dt>
                <dd className={cx("mt-1 font-mono text-[22px] font-bold", n ? "text-white" : "text-white/25")}>{n}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {!d.chartPrepared && d.total === 0 ? (
        <EmptyState title="Check back after charting">The first chart is usually prepared about four hours before departure from the boarding station. Vacant berths appear here once it is.</EmptyState>
      ) : coaches.length === 0 ? (
        <EmptyState title="No vacant berths right now">Every berth is taken for this boarding point. Berths can free up at the next chart station.</EmptyState>
      ) : (
        <>
          {classes.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Class">
              <span className="label mr-1">Class</span>
              {["all", ...classes].map((c) => (
                <button key={c} type="button" role="radio" aria-checked={cls === c} onClick={() => setCls(c)}
                  className={cx("rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all", cls === c ? "bg-ink text-signal" : "border border-slate-200 bg-white text-slate-600 hover:border-ink hover:text-ink")}>
                  {c === "all" ? "All" : `${c} · ${d.byClass[c]}`}
                </button>
              ))}
            </div>
          )}
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {coaches.map((c, i) => (
              <li key={c.coach} data-reveal style={{ ["--d" as string]: `${i * 50}ms` }} className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-ink font-mono text-[16px] font-bold text-signal">{c.coach}</span>
                    <div>
                      <p className="font-semibold text-ink">Coach {c.coach}</p>
                      <p className="text-[12.5px] text-slate-500">{c.cls}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-brand-700">{c.berths.length} free</span>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {c.berths.map((b) => (
                    <li key={`${b.berthNo}-${b.from}`} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-[13px]">
                      <span className="w-8 font-mono font-bold text-ink">{b.berthNo}</span>
                      <span className="w-24 text-slate-600">{b.berthType}</span>
                      <span className="ml-auto flex items-center gap-1.5 font-mono text-[12px] text-slate-500">
                        {b.from} <span className="text-signal">→</span> {b.to}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="text-[12.5px] text-slate-500">Each berth is free only for the stretch shown. Vacant berths are allotted by the on-board ticket examiner under Indian Railways rules.</p>
        </>
      )}
    </div>
  );
}
