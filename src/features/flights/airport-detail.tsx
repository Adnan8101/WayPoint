"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Airport, AirportBoard, BoardFlight } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { cx, fmtDayOf } from "@/lib/format";
import { Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton, Skeleton, TimeLegend } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, ShareButton, Tabs, TimeTag } from "@/components/ui";
import { FlightStatusPill } from "./flight-parts";
import { LocalClock } from "@/components/local-clock";

const RouteMap = dynamic(() => import("@/components/route-map"), { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> });

export function AirportDetail({ code, airport }: { code: string; airport: Airport | null }) {
  const [tab, setTab] = useState<"departures" | "arrivals">("departures");
  const req = useMemo(() => ({ url: `/api/airports/${code}/board` }), [code]);
  const { state, refresh } = useApi<AirportBoard>(req);
  const points = useMemo(() => (airport ? [{ lat: airport.lat, lon: airport.lon, label: airport.iata, kind: "origin" as const }] : []), [airport]);

  useEffect(() => {
    addRecent({ kind: "airport", label: airport ? `${airport.iata} · ${airport.city}` : code, href: `/airports/${code}` });
  }, [code, airport]);

  return (
    <>
      <Section className="relative -mt-20">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-5">
            <h2 className="font-semibold text-ink">Airport details</h2>
            {airport ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-slate-500">IATA code</dt><dd className="font-mono font-semibold">{airport.iata}</dd></div>
                <div><dt className="text-slate-500">ICAO code</dt><dd className="font-mono font-semibold">{airport.icao || "—"}</dd></div>
                <div><dt className="text-slate-500">City</dt><dd className="font-medium">{airport.city}</dd></div>
                <div><dt className="text-slate-500">Country</dt><dd className="font-medium">{airport.country}</dd></div>
                <div><dt className="text-slate-500">Local time</dt><dd className="font-medium">{airport.timeZone ? <LocalClock timeZone={airport.timeZone} /> : "—"}</dd></div>
                <div><dt className="text-slate-500">Time zone</dt><dd className="font-medium">{airport.timeZone ?? "—"}</dd></div>
                <div className="col-span-2"><dt className="text-slate-500">Location</dt><dd className="font-medium tabular-nums">{airport.lat.toFixed(4)}, {airport.lon.toFixed(4)}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Reference details for {code} could not be loaded right now.</p>
            )}
            <div className="mt-4"><ShareButton title={`${airport?.name ?? code} arrivals & departures`} /></div>
          </Card>
          {airport ? <RouteMap points={points} path={[]} heightClass="h-56 lg:h-full min-h-56" /> : <div />}
        </div>
      </Section>
      <Section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[26px] font-bold text-ink">Flight information</h2>
          <Tabs label="Flight board" value={tab} onChange={setTab} tabs={[{ value: "departures", label: "Departures" }, { value: "arrivals", label: "Arrivals" }]} />
        </div>
        <ApiResult state={state} onRetry={refresh} skeleton={<ResultSkeleton rows={8} />}>
          {(board, meta, refreshing) => (
            <div className="space-y-4">
              <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={10 * 60_000} />
              <p className="text-xs text-slate-500">Showing flights from 1 hour ago to the next 11 hours, in airport local time.</p>
              <BoardTable flights={board[tab]} direction={tab} />
              <TimeLegend />
            </div>
          )}
        </ApiResult>
      </Section>
    </>
  );
}

function BoardTable({ flights, direction }: { flights: BoardFlight[]; direction: "departures" | "arrivals" }) {
  if (!flights.length) return <EmptyState title={`No ${direction} reported in this time window`} />;
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-[var(--shadow-card)]">
      <table className="w-full text-sm">
        <thead className="bg-slate-50/80 text-left text-[12.5px] font-medium text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Time</th>
            <th className="px-4 py-3 font-semibold">Flight</th>
            <th className="px-4 py-3 font-semibold">{direction === "departures" ? "To" : "From"}</th>
            <th className="hidden px-4 py-3 font-semibold md:table-cell">Terminal / Gate</th>
            <th className="px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {flights.map((f, i) => {
            const live = f.actual ?? f.estimated;
            const changed = live && f.scheduled && live.value !== f.scheduled.value;
            return (
              <tr key={`${f.number}-${i}`} className={cx(f.status === "Cancelled" && "bg-red-50/50")}>
                <td className="px-4 py-3 align-top">
                  <div className={cx(changed && "text-slate-400 line-through decoration-1")}><TimeTag t={f.scheduled} /></div>
                  {changed && <div className="mt-0.5"><TimeTag t={live} /></div>}
                  <div className="text-[11px] text-slate-400">{fmtDayOf(f.scheduled?.value)}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <Link href={`/flight-status?flight=${f.number}&date=${f.scheduled?.value.slice(0, 10) ?? ""}`} className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 transition-colors hover:decoration-ink">{f.number}</Link>
                  <div className="max-w-[10rem] truncate text-xs text-slate-500">{f.airline.name}</div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-ink">{f.otherAirport.city ?? f.otherAirport.name}</div>
                  <div className="text-xs text-slate-500">{f.otherAirport.iata ?? f.otherAirport.icao}</div>
                </td>
                <td className="hidden px-4 py-3 align-top text-slate-700 md:table-cell">{f.terminal ? `T${f.terminal.replace(/^T/i, "")}` : "—"}{f.gate ? ` / ${f.gate}` : ""}</td>
                <td className="px-4 py-3 align-top"><FlightStatusPill status={f.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
