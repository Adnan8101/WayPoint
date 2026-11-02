"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { GetThere } from "@/features/places/get-there";
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
              <EmptyState art="flight" title="Check any flight's live status">
                Enter a flight number and date to see departure and arrival times, gates, terminals and delays.
              </EmptyState>
              <RecentList kinds={["flight", "tracker"]} />
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

/** Departure time to plan around, only while the flight hasn't left */
function plannedDeparture(f: Flight): string | undefined {
  if (!["Scheduled", "Delayed", "Boarding", "Unknown"].includes(f.status)) return undefined;
  const v = f.departure.estimated?.value ?? f.departure.scheduled?.value;
  // Needs a full timestamp, not a bare wall-clock time
  return v && !Number.isNaN(Date.parse(v)) && Date.parse(v) > Date.now() ? v : undefined;
}

function FlightResult({ flight, date }: { flight: Flight; date: string }) {
  const departAt = plannedDeparture(flight);
  const dep = flight.departure.airport;
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
        <Link href={`/flight-tracker?flight=${flight.number}&date=${date}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 font-semibold text-white transition-colors hover:bg-signal hover:text-ink">Track on map →</Link>
        {flight.departure.airport.iata && <Link href={`/airports/${flight.departure.airport.iata}`} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-ink hover:text-ink">{flight.departure.airport.iata} airport info</Link>}
        {flight.arrival.airport.iata && <Link href={`/airports/${flight.arrival.airport.iata}`} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-ink hover:text-ink">{flight.arrival.airport.iata} airport info</Link>}
      </div>
    </Card>
    {departAt && (
      <GetThere
        title="When to leave for the airport"
        destination={dep.lat !== undefined && dep.lon !== undefined ? { label: dep.name, lat: dep.lat, lon: dep.lon } : { label: dep.name, address: `${dep.name}${dep.city ? `, ${dep.city}` : ""}` }}
        departAt={departAt}
        buffers={[60, 90, 120, 180]}
        defaultBuffer={120}
      />
    )}
    </>
  );
}
