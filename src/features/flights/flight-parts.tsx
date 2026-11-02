"use client";

import { useState } from "react";
import type { Flight, FlightEnd, FlightStatus } from "@/lib/types";
import { cx, fmtDayOf, fmtDelay, fmtDuration } from "@/lib/format";
import { CopyButton, Pill, TimeTag } from "@/components/ui";
import { CheckIcon, PlaneIcon } from "@/components/icons";

const STATUS_TONE: Record<FlightStatus, "slate" | "green" | "amber" | "red" | "blue" | "violet"> = {
  Scheduled: "slate",
  Boarding: "violet",
  Departed: "blue",
  "In Air": "blue",
  Landed: "green",
  Delayed: "amber",
  Cancelled: "red",
  Diverted: "red",
  Unknown: "slate",
};

export function FlightStatusPill({ status, large }: { status: FlightStatus; large?: boolean }) {
  return (
    <Pill tone={STATUS_TONE[status]} className={large ? "px-3 py-1.5 text-[13.5px]" : undefined}>
      {status === "Unknown" ? "Status unknown" : status}
    </Pill>
  );
}

export function AirlineLogo({ iata, name }: { iata?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!iata || failed) {
    return (
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink font-mono text-[13px] font-medium text-white" aria-hidden>
        {(iata ?? name).slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://pics.avs.io/120/120/${encodeURIComponent(iata)}.png`}
      alt={`${name} logo`}
      width={44}
      height={44}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-11 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
    />
  );
}

/** Departure → progress → arrival journey timeline */
export function FlightTimeline({ flight }: { flight: Flight }) {
  const p = flight.progress;
  const stages: FlightStatus[] = ["Scheduled", "Boarding", "Departed", "In Air", "Landed"];
  const cancelled = flight.status === "Cancelled" || flight.status === "Diverted";
  const currentIdx = stages.indexOf(flight.status === "Delayed" ? "Scheduled" : flight.status);
  const dur = duration(flight);

  return (
    <div>
      <div className="flex items-center gap-4 sm:gap-6">
        <AirportCode end={flight.departure} />
        <div className="relative flex-1" aria-label={p !== undefined ? `Flight progress ${Math.round(p * 100)}%` : "Flight progress unknown"}>
          <p className="mb-3 text-center text-[12.5px] text-slate-500">
            {dur ? fmtDuration(dur) : " "}
            {flight.distanceKm ? ` · ${Math.round(flight.distanceKm).toLocaleString("en-IN")} km` : ""}
          </p>
          <div className="relative h-1.5 rounded-full bg-slate-100">
            {p !== undefined && !cancelled && (
              <div className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-all" style={{ width: `${p * 100}%` }} />
            )}
            {cancelled && <div className="absolute inset-0 rounded-full bg-red-300" />}
            <span className="absolute -left-0.5 top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-white bg-ink shadow" aria-hidden />
            <span className="absolute -right-0.5 top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-ink bg-white" aria-hidden />
            {p !== undefined && !cancelled && (
              <span className="absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-mint shadow-lg ring-4 ring-white" style={{ left: `${p * 100}%` }}>
                <PlaneIcon width={17} height={17} className="rotate-45" />
              </span>
            )}
          </div>
          <p className="mt-3 text-center text-[12.5px] font-medium text-slate-600">{cancelled ? flight.status : p !== undefined ? `${Math.round(p * 100)}% complete` : " "}</p>
        </div>
        <AirportCode end={flight.arrival} align="right" />
      </div>
      {!cancelled && (
        <ol className="mt-6 grid grid-cols-5 gap-1.5">
          {stages.map((s, i) => (
            <li key={s} className="text-center">
              <div className={cx("h-1 rounded-full", i <= currentIdx ? "bg-brand-500" : "bg-slate-100")} />
              <p className={cx("mt-2 flex items-center justify-center gap-1 text-[12px] font-medium", i === currentIdx ? "text-ink" : i < currentIdx ? "text-slate-500" : "text-slate-300")}>
                {i < currentIdx && <CheckIcon width={12} height={12} className="text-brand-600" />}
                {s}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function duration(f: Flight): number | undefined {
  const d = f.departure.actual?.value ?? f.departure.estimated?.value ?? f.departure.scheduled?.value;
  const a = f.arrival.actual?.value ?? f.arrival.estimated?.value ?? f.arrival.scheduled?.value;
  if (!d || !a) return undefined;
  const m = Math.round((Date.parse(a) - Date.parse(d)) / 60_000);
  return m > 0 ? m : undefined;
}

function AirportCode({ end, align = "left" }: { end: FlightEnd; align?: "left" | "right" }) {
  return (
    <div className={cx("w-20 shrink-0 sm:w-28", align === "right" && "text-right")}>
      <p className="font-display text-4xl font-semibold text-ink sm:text-5xl">{end.airport.iata ?? end.airport.icao ?? "—"}</p>
      <p className="mt-1 truncate text-[13px] text-slate-500" title={end.airport.name}>{end.airport.city ?? end.airport.name}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-[14px] text-slate-500">{label}</dt>
      <dd className="text-right text-[14px] font-medium text-ink">{children}</dd>
    </div>
  );
}

export function FlightEndDetails({ title, end, isDeparture }: { title: string; end: FlightEnd; isDeparture: boolean }) {
  const delay = fmtDelay(end.delayMinutes);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">{title}</p>
          <p className="mt-1 truncate text-[16px] font-semibold text-ink">{end.airport.name}</p>
          <p className="text-[12.5px] text-slate-500">{[end.airport.iata, end.airport.icao].filter(Boolean).join(" · ")}{end.scheduled ? ` · ${fmtDayOf(end.scheduled.value)}` : ""}</p>
        </div>
        {delay.tone !== "none" && (
          <Pill tone={delay.tone === "ok" ? "green" : delay.tone === "warn" ? "amber" : "red"}>{delay.text}</Pill>
        )}
      </div>
      <dl className="divide-y divide-slate-200/70">
        <Row label="Scheduled"><TimeTag t={end.scheduled} /></Row>
        {end.actual ? (
          <Row label="Actual"><TimeTag t={end.actual} /></Row>
        ) : (
          <Row label="Estimated">{end.estimated ? <TimeTag t={end.estimated} /> : <span className="font-normal text-slate-400">Not reported</span>}</Row>
        )}
        <Row label="Terminal">{end.terminal ?? <span className="font-normal text-slate-400">Not announced</span>}</Row>
        <Row label="Gate">{end.gate ?? <span className="font-normal text-slate-400">Not announced</span>}</Row>
        {!isDeparture && end.baggageBelt && <Row label="Baggage belt">{end.baggageBelt}</Row>}
        {isDeparture && end.checkInDesk && <Row label="Check-in desk">{end.checkInDesk}</Row>}
      </dl>
    </div>
  );
}

export function FlightHeader({ flight }: { flight: Flight }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <AirlineLogo iata={flight.airline.iata} name={flight.airline.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h2 className="font-mono text-[22px] font-semibold tracking-tight text-ink">{flight.number}</h2>
          <CopyButton value={flight.number} label="flight number" />
        </div>
        <p className="text-[14px] text-slate-500">{flight.airline.name}{flight.aircraft?.model ? ` · ${flight.aircraft.model}` : ""}{flight.aircraft?.registration ? ` · ${flight.aircraft.registration}` : ""}</p>
      </div>
      <FlightStatusPill status={flight.status} large />
    </div>
  );
}
