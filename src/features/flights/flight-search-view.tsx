"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FlightSearchResult } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { useAirport } from "@/lib/client/lookups";
import { fmtDate, fmtDayOf, fmtDuration } from "@/lib/format";
import { FlightSearchForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton, TimeLegend } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, CopyButton, SelectField, ShareButton, Tabs, TimeTag } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { AirlineLogo, FlightStatusPill } from "./flight-parts";

export function FlightSearchView() {
  const params = useSearchParams();
  const initial = Object.fromEntries(params.entries());
  const { from, to, date } = initial;
  const ret = initial.return;
  const [leg, setLeg] = useState<"out" | "back">("out");
  const legFrom = leg === "out" ? from : to;
  const legTo = leg === "out" ? to : from;
  const legDate = leg === "out" ? date : ret;

  const req = useMemo(
    () => (legFrom && legTo && legDate ? { url: `/api/flights/search?from=${encodeURIComponent(legFrom)}&to=${encodeURIComponent(legTo)}&date=${encodeURIComponent(legDate)}` } : null),
    [legFrom, legTo, legDate],
  );
  const { state, refresh } = useApi<FlightSearchResult[]>(req);

  useEffect(() => setLeg("out"), [from, to, date, ret]);
  useEffect(() => {
    if (state.status === "success" && from && to && leg === "out") {
      addRecent({ kind: "flight-search", label: `${from} → ${to} · ${fmtDate(date, { day: "numeric", month: "short" })}`, href: `/flight-search?${params}` });
    }
  }, [state.status, from, to, date, leg, params]);

  return (
    <>
      <SearchPanel>
        <FlightSearchForm key={params.toString()} initial={initial} />
      </SearchPanel>
      <Section>
        {ret && from && to && (
          <div className="mb-4">
            <Tabs label="Journey leg" value={leg} onChange={setLeg} tabs={[{ value: "out", label: `${from} → ${to} · ${fmtDate(date, { day: "numeric", month: "short" })}` }, { value: "back", label: `${to} → ${from} · ${fmtDate(ret, { day: "numeric", month: "short" })}` }]} />
          </div>
        )}
        <ApiResult
          state={state}
          onRetry={refresh}
          skeleton={<ResultSkeleton rows={6} />}
          idle={
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <EmptyState art="search" title="Discover flights between airports">
                Search by city or airport code to see direct flights on a date with times, duration and aircraft. WayPoint is an information service: book directly with the airline.
              </EmptyState>
              <RecentList kinds={["flight-search"]} />
            </div>
          }
        >
          {(data, meta, refreshing) => <Results data={data} meta={meta} refreshing={refreshing} refresh={refresh} from={legFrom!} to={legTo!} date={legDate!} pax={initial.pax} cls={initial.class} />}
        </ApiResult>
      </Section>
    </>
  );
}

type Sort = "dep" | "arr" | "dur";

function Results({ data, meta, refreshing, refresh, from, to, date, pax, cls }: {
  data: FlightSearchResult[]; meta: import("@/lib/types").ApiMeta; refreshing: boolean; refresh: () => void; from: string; to: string; date: string; pax?: string; cls?: string;
}) {
  const [sort, setSort] = useState<Sort>("dep");
  const [airline, setAirline] = useState("all");
  const airlines = useMemo(() => [...new Set(data.map((d) => d.airline.name).filter(Boolean))].sort(), [data]);
  const rows = useMemo(() => {
    const t = (v?: string) => (v ? Date.parse(v) : Infinity);
    return data
      .filter((d) => airline === "all" || d.airline.name === airline)
      .sort((a, b) =>
        sort === "dep" ? t(a.departure?.value) - t(b.departure?.value)
          : sort === "arr" ? t(a.arrival?.value) - t(b.arrival?.value)
            : (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity),
      );
  }, [data, sort, airline]);
  const fromA = useAirport(from);
  const toA = useAirport(to);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[30px] font-bold text-ink">{fromA?.city || from} <span className="text-signal">→</span> {toA?.city || to}</h2>
          <p className="text-sm text-slate-600">{rows.length} direct flight{rows.length === 1 ? "" : "s"} on {fmtDate(date)}{pax ? ` · ${pax} passenger${pax === "1" ? "" : "s"}` : ""}{cls ? ` · ${cls[0].toUpperCase()}${cls.slice(1)}` : ""}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SelectField id="fs-airline" label="Airline" value={airline} onChange={setAirline} options={[{ value: "all", label: "All airlines" }, ...airlines.map((a) => ({ value: a, label: a }))]} />
          <SelectField id="fs-sort" label="Sort by" value={sort} onChange={(v) => setSort(v as Sort)} options={[{ value: "dep", label: "Departure time" }, { value: "arr", label: "Arrival time" }, { value: "dur", label: "Duration" }]} />
          <ShareButton title={`Flights ${from} to ${to}`} />
        </div>
      </div>
      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} />
      <p className="rounded-2xl bg-sky-50 px-4 py-2.5 text-sm text-sky-900 ring-1 ring-inset ring-sky-200/70">
        Showing direct flights from the departure schedule. Fares are not available from our data source, so check the airline for prices and seat availability.
      </p>
      <ul className="space-y-3">
        {rows.map((f) => (
          <li key={f.number}>
            <Card className="grid items-center gap-4 p-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_auto]">
              <div className="flex items-center gap-3">
                <AirlineLogo iata={f.airline.iata} name={f.airline.name} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-semibold text-ink">{f.number} <CopyButton value={f.number} label="flight number" /></p>
                  <p className="truncate text-xs text-slate-500">{f.airline.name}{f.aircraftModel ? ` · ${f.aircraftModel}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div><TimeTag t={f.departure} /><p className="text-xs text-slate-500">{f.from.iata} {fmtDayOf(f.departure?.value)}</p></div>
                <div className="flex-1 text-center text-xs text-slate-500">
                  <p>{fmtDuration(f.durationMinutes)}</p>
                  <div className="my-1 h-px bg-slate-300" />
                  <p>{f.stops === 0 ? "Non-stop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}</p>
                </div>
                <div className="text-right"><TimeTag t={f.arrival} /><p className="text-xs text-slate-500">{f.to.iata} {fmtDayOf(f.arrival?.value)}</p></div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                <FlightStatusPill status={f.status} />
                <Link href={`/flight-status?flight=${f.number}&date=${date}`} className="text-sm font-medium text-ink underline decoration-signal decoration-2 underline-offset-4 transition-colors hover:decoration-ink">Flight status →</Link>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <EmptyState title="No flights match the selected airline" />}
      <TimeLegend />
    </div>
  );
}
