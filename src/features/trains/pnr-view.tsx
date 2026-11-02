"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PnrStatus } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { normalizePnr } from "@/lib/validation";
import { fmtDate } from "@/lib/format";
import { PnrForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, Freshness, ResultSkeleton } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, CopyButton, Pill } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { BOOKING_STATUS_INFO, BookingStatusPill, TrainTitle } from "./train-parts";

function readHash(): string | null {
  const m = window.location.hash.match(/pnr=(\d{10})/);
  return m ? normalizePnr(m[1]) : null;
}

export const maskPnr = (p: string) => `${p.slice(0, 3)}••••${p.slice(-3)}`;

export function PnrView() {
  const [pnr, setPnr] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setPnr(readHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const req = useMemo(() => (pnr ? { url: "/api/trains/pnr", body: { pnr } } : null), [pnr]);
  const { state, refresh } = useApi<PnrStatus>(req);

  useEffect(() => {
    if (state.status === "success" && pnr) addRecent({ kind: "pnr", label: `PNR ${maskPnr(pnr)}`, href: `/pnr-status#pnr=${pnr}` });
  }, [state.status, pnr]);

  const submit = (p: string) => {
    if (p === pnr) refresh();
    else window.location.hash = `pnr=${p}`;
  };

  return (
    <>
      <SearchPanel>
        <PnrForm key={pnr ?? "empty"} initial={pnr ?? ""} onSubmitPnr={submit} busy={state.status === "loading"} />
      </SearchPanel>
      <Section>
        <ApiResult
          state={state}
          onRetry={refresh}
          skeleton={<ResultSkeleton rows={4} />}
          idle={
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-6">
                <EmptyState art="pnr" title="Check your booking status">Enter the 10-digit PNR from your ticket or booking SMS to see confirmation, RAC or waiting-list status for each passenger.</EmptyState>
                <StatusGuide />
              </div>
              <RecentList kinds={["pnr"]} title="Recent PNRs" />
            </div>
          }
        >
          {(d, meta, refreshing) => (
            <div className="space-y-6">
              <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={30 * 60_000} />
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <TrainTitle number={d.trainNumber} name={d.trainName} sub={<span>Journey on <strong>{fmtDate(d.journeyDate)}</strong></span>} />
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-500">PNR</p>
                    <p className="flex items-center gap-1 font-mono text-lg font-bold">{d.pnr} <CopyButton value={d.pnr} label="PNR number" /></p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Info label="Boarding" value={d.boarding.code} sub={d.boarding.name} />
                  <Info label="Destination" value={d.destination.code} sub={d.destination.name} />
                  <Info label="Class" value={d.travelClass || "—"} />
                  <Info label="Quota" value={d.quota || "—"} />
                </div>
                <div className="mt-5">
                  {d.chartPrepared ? (
                    <Pill tone="green">Chart prepared: status is final</Pill>
                  ) : (
                    <Pill tone="amber">Chart not prepared: status may still change</Pill>
                  )}
                </div>
                {d.chartPrepared && d.trainNumber && d.boarding.code && d.passengers.some((p) => p.currentStatusCode !== "CNF" && p.currentStatusCode !== "CAN") && (
                  <Link
                    href={`/chart-vacancy?${new URLSearchParams({ train: d.trainNumber, boarding: d.boarding.code, date: d.journeyDate })}`}
                    className="group mt-5 flex items-center justify-between gap-4 rounded-2xl bg-ink p-4 text-white transition-transform hover:-translate-y-0.5"
                  >
                    <span>
                      <span className="block font-semibold">Still not confirmed?</span>
                      <span className="block text-[13px] text-white/60">See vacant berths on this train after charting, coach by coach.</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-signal px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-transform group-hover:translate-x-1">Find berths →</span>
                  </Link>
                )}
              </Card>

              <Card className="overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-4">
                  <h3 className="font-display text-[22px] font-bold text-ink">Passengers ({d.passengers.length})</h3>
                  <p className="text-xs text-slate-500"><strong>Booking status</strong> is what you got when you booked. <strong>Current status</strong> is your status now.</p>
                </div>
                {d.passengers.length === 0 ? (
                  <p className="p-5 text-sm text-slate-500">Passenger status was not returned for this PNR.</p>
                ) : (
                  <>
                    <table className="hidden w-full text-sm sm:table">
                      <thead className="bg-slate-50/80 text-left text-[12.5px] font-medium text-slate-500">
                        <tr><th className="px-5 py-3">Passenger</th><th className="px-5 py-3">Booking status</th><th className="px-5 py-3">Current status</th><th className="px-5 py-3">Coach / Berth</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {d.passengers.map((p) => (
                          <tr key={p.number}>
                            <td className="px-5 py-3 font-medium">Passenger {p.number}</td>
                            <td className="px-5 py-3"><BookingStatusPill code={p.bookingStatusCode} text={p.bookingStatus} /></td>
                            <td className="px-5 py-3"><BookingStatusPill code={p.currentStatusCode} text={p.currentStatus} /></td>
                            <td className="px-5 py-3 text-slate-700">{berth(p)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <ul className="divide-y divide-slate-200 sm:hidden">
                      {d.passengers.map((p) => (
                        <li key={p.number} className="space-y-2 px-5 py-4">
                          <p className="font-medium">Passenger {p.number}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div><p className="mb-1 text-slate-500">Booking status</p><BookingStatusPill code={p.bookingStatusCode} text={p.bookingStatus} /></div>
                            <div><p className="mb-1 text-slate-500">Current status</p><BookingStatusPill code={p.currentStatusCode} text={p.currentStatus} /></div>
                          </div>
                          <p className="text-xs text-slate-600">Coach / Berth: {berth(p)}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
              <div className="flex flex-wrap gap-2 text-sm">
                {d.trainNumber && <Link href={`/train-status?train=${d.trainNumber}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 font-semibold text-white transition-colors hover:bg-signal hover:text-ink">Running status of {d.trainNumber} →</Link>}
                {d.trainNumber && <Link href={`/train-schedule?train=${d.trainNumber}`} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 shadow-[var(--shadow-card)] transition-all hover:-translate-y-px hover:border-ink hover:text-ink">Train schedule</Link>}
              </div>
              <p className="text-xs text-slate-500">We don&apos;t store PNR results. This information is fetched when you ask for it and shown only to you.</p>
              <StatusGuide />
            </div>
          )}
        </ApiResult>
      </Section>
    </>
  );
}

function berth(p: PnrStatus["passengers"][number]) {
  const parts = [p.coach, p.berth, p.berthType].filter(Boolean);
  return parts.length ? parts.join(" / ") : <span className="text-slate-400">Not allotted</span>;
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-[22px] font-semibold tracking-tight text-ink">{value || "—"}</p>
      {sub && <p className="truncate text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function StatusGuide() {
  return (
    <Card className="p-5">
      <h3 className="font-display text-[22px] font-bold text-ink">What the booking status codes mean</h3>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {Object.entries(BOOKING_STATUS_INFO).map(([code, info]) => (
          <div key={code} className="flex items-center gap-2 text-sm">
            <dt><Pill tone={info.tone} className="w-14 justify-center font-mono">{code}</Pill></dt>
            <dd className="text-slate-700">{info.label}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
