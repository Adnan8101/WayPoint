"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { FlightMap } from "./flight-map";
import type { Flight } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { normalizeFlightNumber } from "@/lib/validation";
import { fmtDate } from "@/lib/format";
import { FlightStatusForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton, TimeLegend } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, ShareButton } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { FlightEndDetails, FlightHeader, FlightTimeline } from "./flight-parts";

export function FlightStatusView() {
  const params = useSearchParams();
  const rawFlight = params.get("flight") ?? "";
  const date = params.get("date") ?? "";
  const flight = normalizeFlightNumber(rawFlight);
  const req = useMemo(
    () => (rawFlight ? { url: `/api/flights/status?number=${encodeURIComponent(rawFlight)}&date=${encodeURIComponent(date)}` } : null),
    [rawFlight, date],
  );
  const { state, refresh } = useApi<Flight[]>(req);

  useEffect(() => {
    if (state.status === "success" && flight) {
      addRecent({ kind: "flight", label: `${flight} · ${fmtDate(date, { day: "numeric", month: "short" })}`, href: `/flight-status?flight=${flight}&date=${date}` });
    }
  }, [state.status, flight, date]);

  return (
    <>
      <SearchPanel>
        <FlightStatusForm key={`${rawFlight}-${date}`} initial={{ number: rawFlight, date: date || undefined }} />
      </SearchPanel>
      <Section>
        <ApiResult
          state={state}
          onRetry={refresh}
          skeleton={<ResultSkeleton rows={5} />}
          idle={
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <EmptyState title="Check any flight's live status">
                Enter a flight number and date to see departure and arrival times, gates, terminals and delays.
              </EmptyState>
              <RecentList kinds={["flight"]} />
            </div>
          }
        >
          {(data, meta, refreshing) => (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[22px] font-semibold tracking-tight text-ink">
                  {data.length > 1 ? `${data.length} flights match ${flight}` : `Flight ${flight}`} on {fmtDate(date)}
                </h2>
                <ShareButton title={`Flight ${flight} status`} />
              </div>
              <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} providerLabel="Flight data updated" />
              {data.map((f, i) => <FlightResult key={`${f.number}-${i}`} flight={f} date={date} />)}
              <TimeLegend />
            </div>
          )}
        </ApiResult>
      </Section>
    </>
  );
}

function FlightResult({ flight }: { flight: Flight; date: string }) {
  return (
    <>
    <Card className="p-5 sm:p-6">
      <FlightHeader flight={flight} />
      {flight.status === "Cancelled" && (
        <p className="mt-4 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">This flight has been reported as cancelled. Contact the airline for rebooking options.</p>
      )}
      {flight.status === "Diverted" && (
        <p className="mt-4 bg-red-50 px-4 py-2 text-sm font-medium text-red-800">This flight has been diverted. The arrival airport may differ from the schedule.</p>
      )}
      <div className="mt-6"><FlightTimeline flight={flight} /></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <FlightEndDetails title="Departure" end={flight.departure} isDeparture />
        <FlightEndDetails title="Arrival" end={flight.arrival} isDeparture={false} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {flight.departure.airport.iata && <Link href={`/airports/${flight.departure.airport.iata}`} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-ink hover:text-ink">{flight.departure.airport.iata} airport info</Link>}
        {flight.arrival.airport.iata && <Link href={`/airports/${flight.arrival.airport.iata}`} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-ink hover:text-ink">{flight.arrival.airport.iata} airport info</Link>}
      </div>
      <FlightMap flight={flight} />
    </Card>
    </>
  );
}
