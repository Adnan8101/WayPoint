"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AllClassesAvailability, ApiMeta, AvailabilityType, SeatAvailability, TrainBetween, TrainFare, TrainsBetweenResult } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { useStation } from "@/lib/client/lookups";
import { addRecent } from "@/lib/client/recent";
import { cx, fmtDate, fmtDuration } from "@/lib/format";
import { QUOTA_OPTIONS, SEAT_CLASS_OPTIONS, SeatsForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, ErrorState, Freshness, ResultSkeleton, Skeleton } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { CopyButton, ShareButton } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { ArrowRightIcon } from "@/components/icons";
import { RunDays } from "./train-parts";

const TONE: Record<AvailabilityType, { tile: string; dot: string; label: string }> = {
  AVAILABLE: { tile: "border-brand-200 bg-brand-50 text-brand-800", dot: "bg-brand-500", label: "Available" },
  RAC: { tile: "border-sky-200 bg-sky-50 text-sky-800", dot: "bg-sky-500", label: "RAC" },
  WAITLIST: { tile: "border-amber-200 bg-amber-50 text-amber-900", dot: "bg-amber-500", label: "Waiting list" },
  REGRET: { tile: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500", label: "Not available" },
  OTHER: { tile: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400", label: "Check IRCTC" },
};

/** "AVAILABLE-0042" → 42 seats; "GNWL235/WL132" → WL 132 now, GNWL235 at booking */
function readStatus(status: string, type: AvailabilityType): { big: string; small?: string } {
  const avl = status.match(/AVAILABLE-?0*(\d+)/i);
  if (avl) return { big: avl[1], small: "seats" };
  if (type === "WAITLIST" || type === "RAC") {
    const [booked, now] = status.split("/");
    const cur = (now ?? booked).match(/([A-Z]+)\s*0*(\d+)/);
    return cur ? { big: `${cur[1]} ${cur[2]}`, small: now ? booked : undefined } : { big: status };
  }
  if (type === "REGRET") return { big: "Regret" };
  return { big: status.replace(/-/g, " ") || "—" };
}

export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const isCode = (v: string) => /^[A-Z]{1,5}$/.test(v);
const day = (d: string) => fmtDate(d, { weekday: "short", day: "numeric", month: "short" });

export function SeatsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = Object.fromEntries(["train", "from", "to", "date", "class", "quota"].map((k) => [k, params.get(k) ?? ""]));
  const ready = Boolean(q.from && q.to && q.date);
  const cls = q.class || "ANY";
  const quota = q.quota || "GN";
  // Codes get their station name; typed places (a city) show as typed
  const fromStation = useStation(isCode(q.from) ? q.from : undefined);
  const toStation = useStation(isCode(q.to) ? q.to : undefined);
  const fromLabel = fromStation?.name ?? q.from;
  const toLabel = toStation?.name ?? q.to;

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  useEffect(() => {
    if (ready) addRecent({ kind: "seats", label: `${q.train ? `${q.train} · ` : ""}${fromLabel} → ${toLabel}`, href: `/seat-availability?${params.toString()}` });
  }, [ready, params]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <SearchPanel>
        <SeatsForm key={params.toString()} initial={q} />
      </SearchPanel>
      <Section>
        {!ready ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <EmptyState art="seats" title="Will you get a berth?">
              Search by train name or number, or just give From and To to see every train on the route. Pick &ldquo;Any class&rdquo; to compare every class&apos;s fare and seats at once.
            </EmptyState>
            <RecentList kinds={["seats"]} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                {q.train && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-lg bg-ink px-2.5 py-1 font-mono text-[15px] font-bold tracking-wider text-signal">{q.train}</span>
                    <CopyButton value={q.train} label="train number" />
                  </div>
                )}
                <h2 className="font-display text-[30px] font-bold text-ink sm:text-[38px]">
                  {fromLabel} <span className="text-signal">→</span> {toLabel}
                </h2>
                <p className="mt-1 text-[15px] text-slate-500">{q.train ? "From" : "Trains on"} {fmtDate(q.date, { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              <ShareButton title={`Seats ${fromLabel} to ${toLabel}`} />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Chips label="Class" value={cls} options={SEAT_CLASS_OPTIONS.map((c) => ({ value: c.value, label: c.value === "ANY" ? "Any" : c.value }))} onChange={(v) => setParams({ class: v })} />
              <Chips label="Quota" value={quota} options={QUOTA_OPTIONS} onChange={(v) => setParams({ quota: v })} />
            </div>

            {q.train ? (
              cls === "ANY" ? (
                <AllClassesView train={q.train} from={q.from} to={q.to} date={q.date} quota={quota} onPick={(c) => setParams({ class: c })} />
              ) : (
                <OneClassView train={q.train} from={q.from} to={q.to} date={q.date} cls={cls} quota={quota} onPick={(c) => setParams({ class: c })} />
              )
            ) : (
              <RouteView from={q.from} to={q.to} date={q.date} cls={cls} quota={quota} onDate={(d) => setParams({ date: d })} />
            )}
            <p className="text-[12.5px] text-slate-500">Availability and fares come from Indian Railways via irctc.dev and change constantly. Book only on IRCTC or an authorised agent.</p>
          </div>
        )}
      </Section>
    </>
  );
}

function Chips({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      <span className="label mr-1">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-all",
            value === o.value ? "bg-ink text-signal shadow-[0_6px_14px_-6px_rgb(11_13_16/0.6)]" : "border border-slate-200 bg-white text-slate-600 hover:-translate-y-px hover:border-ink hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** "Train doesn't run on X, showing its next run" */
function MovedNotice({ requested, shownFrom }: { requested?: string; shownFrom?: string }) {
  if (!requested) return null;
  return (
    <p role="status" className="animate-fade-up flex items-center gap-2 rounded-2xl bg-signal-soft px-4 py-3 text-[14px] text-ink ring-1 ring-inset ring-amber-200">
      <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
      This train doesn&apos;t leave on {day(requested)}{shownFrom ? <>. Showing its next run, from <strong className="font-semibold">{day(shownFrom)}</strong>.</> : "."}
    </p>
  );
}

// ---------- One train, every class ----------

function AllClassesView({ train, from, to, date, quota, onPick }: { train: string; from: string; to: string; date: string; quota: string; onPick: (c: string) => void }) {
  const req = useMemo(() => ({ url: `/api/trains/availability?${new URLSearchParams({ train, from, to, date, quota, class: "ANY" })}` }), [train, from, to, date, quota]);
  const { state, refresh } = useApi<AllClassesAvailability>(req);
  return (
    <ApiResult state={state} onRetry={refresh} skeleton={<ResultSkeleton rows={5} />}>
      {(d, meta, refreshing) => {
        const dates = [...new Set(d.classes.flatMap((c) => c.days.map((x) => x.date)))].sort().slice(0, 7);
        return (
          <div className="space-y-4">
            <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={10 * 60_000} />
            <MovedNotice requested={d.requestedDate} shownFrom={dates[0]} />
            <div data-reveal className="overflow-x-auto rounded-[22px] border border-slate-200/80 bg-white shadow-[var(--shadow-card)]">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-left">
                    <th className="px-4 py-3"><span className="label">Class</span></th>
                    <th className="px-4 py-3 text-right"><span className="label">Fare</span></th>
                    {dates.map((x) => <th key={x} className={cx("px-2 py-3 text-center", x === date && "bg-signal-soft")}><span className="label">{day(x)}</span></th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {d.classes.map((c) => (
                    <tr key={c.travelClass} className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => onPick(c.travelClass)} title={`Open the ${c.travelClass} calendar`}>
                      <td className="px-4 py-3">
                        <p className="font-mono font-bold text-ink">{c.travelClass}</p>
                        <p className="text-[12px] text-slate-500">{c.className}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-ink">{c.fare ? inr(c.fare) : "—"}</td>
                      {c.error ? (
                        <td colSpan={dates.length} className="px-4 py-3 text-[12.5px] text-slate-400">{c.error}</td>
                      ) : (
                        dates.map((x) => {
                          const cell = c.days.find((y) => y.date === x);
                          if (!cell) return <td key={x} className="px-2 py-3 text-center text-slate-300">—</td>;
                          const s = readStatus(cell.status, cell.type);
                          return (
                            <td key={x} className="px-1.5 py-2">
                              <span className={cx("block rounded-xl border px-2 py-1.5 text-center", TONE[cell.type].tile, x === date && "ring-2 ring-ink")}>
                                <span className="block font-mono text-[13px] font-bold leading-tight">{s.big}</span>
                                <span className="block text-[10.5px] opacity-70">{s.small ?? TONE[cell.type].label}</span>
                              </span>
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12.5px] text-slate-500">Tap a class to open its full calendar. Fares are per adult, including GST.</p>
          </div>
        );
      }}
    </ApiResult>
  );
}

// ---------- One train, one class ----------

function OneClassView({ train, from, to, date, cls, quota, onPick }: { train: string; from: string; to: string; date: string; cls: string; quota: string; onPick: (c: string) => void }) {
  const availReq = useMemo(() => ({ url: `/api/trains/availability?${new URLSearchParams({ train, from, to, date, class: cls, quota })}` }), [train, from, to, date, cls, quota]);
  const fareQuota = quota === "TQ" ? "TQ" : "GN";
  const fareReq = useMemo(() => ({ url: `/api/trains/fare?${new URLSearchParams({ train, from, to, quota: fareQuota })}` }), [train, from, to, fareQuota]);
  const avail = useApi<SeatAvailability>(availReq);
  const fare = useApi<TrainFare>(fareReq);

  return (
    <div className="space-y-8">
      <ApiResult state={avail.state} onRetry={avail.refresh} skeleton={<CalendarSkeleton />}>
        {(d, meta, refreshing) => <Calendar d={d} meta={meta} refreshing={refreshing} refresh={avail.refresh} selected={date} />}
      </ApiResult>
      <div>
        <div className="mb-4">
          <p className="label">Fare · {fareQuota === "TQ" ? "Tatkal" : "General"} quota</p>
          <h3 className="font-display mt-2 text-[26px] font-bold text-ink">What it costs</h3>
        </div>
        {fare.state.status === "error" ? (
          <ErrorState code={fare.state.code} message={fare.state.message} onRetry={fare.refresh} />
        ) : fare.state.status === "success" ? (
          <Fares f={fare.state.data} selected={cls} onPick={onPick} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-[20px]" />)}</div>
        )}
      </div>
    </div>
  );
}

function Calendar({ d, meta, refreshing, refresh, selected }: { d: SeatAvailability; meta: ApiMeta; refreshing: boolean; refresh: () => void; selected: string }) {
  const firstOpen = d.days.find((x) => x.type === "AVAILABLE");
  const counts = d.days.reduce<Record<string, number>>((m, x) => ((m[x.type] = (m[x.type] ?? 0) + 1), m), {});
  return (
    <div className="space-y-4">
      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={10 * 60_000} />
      <MovedNotice requested={d.requestedDate} shownFrom={d.days[0]?.date} />
      <div data-reveal className="grain relative overflow-hidden rounded-[24px] bg-ink p-5 text-white sm:p-7">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label !text-signal">{d.trainName || `Train ${d.trainNumber}`} · {d.travelClass} · {QUOTA_OPTIONS.find((o) => o.value === d.quota)?.label ?? d.quota}</p>
            <p className="font-display mt-2 text-[26px] font-bold sm:text-[32px]">
              {firstOpen ? <>Seats open from {day(firstOpen.date)}</> : "No confirmed seats in this window"}
            </p>
          </div>
          <ul className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
            {(Object.keys(TONE) as AvailabilityType[]).filter((t) => counts[t]).map((t) => (
              <li key={t} className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-white/70">
                <span className={cx("size-1.5 rounded-full", TONE[t].dot)} /> {counts[t]} {TONE[t].label}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {d.days.map((x, i) => {
          const s = readStatus(x.status, x.type);
          const isSel = x.date === selected;
          return (
            <li key={x.date} className="animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
              <div className={cx("relative h-full rounded-2xl border p-3.5 transition-transform hover:-translate-y-0.5", TONE[x.type].tile, isSel && "ring-2 ring-ink ring-offset-2 ring-offset-paper")}>
                {isSel && <span className="absolute -top-2 right-3 rounded-full bg-ink px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-signal">Your date</span>}
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider opacity-70">{day(x.date)}</p>
                <p className="mt-2 font-mono text-[20px] font-bold leading-none">{s.big}</p>
                <p className="mt-1 text-[11.5px] opacity-70">{s.small ?? TONE[x.type].label}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[12.5px] text-slate-500">Waiting list shows the current position; the smaller figure is the position at booking. Dates the train doesn&apos;t run are skipped.</p>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading availability">
      <Skeleton className="h-28 rounded-[24px]" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{Array.from({ length: 7 }, (_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
    </div>
  );
}

const SEGMENT = ["bg-ink", "bg-signal", "bg-brand-500", "bg-sky-500", "bg-amber-500", "bg-slate-400"];

function Fares({ f, selected, onPick }: { f: TrainFare; selected: string; onPick: (c: string) => void }) {
  const cheapest = Math.min(...f.fares.map((x) => x.total));
  const labels = [...new Set(f.fares.flatMap((x) => x.breakup.map((b) => b.label)))];
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {f.fares.map((c, i) => {
        const active = c.travelClass === selected;
        return (
          <li key={c.travelClass} data-reveal style={{ ["--d" as string]: `${i * 70}ms` }}>
            <button
              type="button"
              onClick={() => onPick(c.travelClass)}
              aria-pressed={active}
              className={cx(
                "group flex h-full w-full flex-col rounded-[20px] border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
                active ? "border-ink bg-white shadow-[var(--shadow-lift)] ring-1 ring-ink" : "border-slate-200/80 bg-white shadow-[var(--shadow-card)]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-[13px] font-bold text-ink">{c.travelClass}</p>
                  <p className="text-[13px] text-slate-500">{c.className}</p>
                </div>
                {c.total === cheapest && f.fares.length > 1 && <span className="rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-brand-700 ring-1 ring-inset ring-brand-200">Lowest</span>}
              </div>
              <p className="font-display mt-4 text-[36px] font-bold leading-none text-ink">{inr(c.total)}</p>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                {c.breakup.map((b) => <span key={b.label} className={cx("h-full", SEGMENT[labels.indexOf(b.label) % SEGMENT.length])} style={{ width: `${(b.amount / c.total) * 100}%` }} />)}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
                {c.breakup.map((b) => (
                  <div key={b.label} className="flex items-center justify-between gap-2">
                    <dt className="flex items-center gap-1.5 text-slate-500"><span className={cx("size-1.5 rounded-full", SEGMENT[labels.indexOf(b.label) % SEGMENT.length])} />{b.label}</dt>
                    <dd className="font-mono font-semibold text-ink">{inr(b.amount)}</dd>
                  </div>
                ))}
              </dl>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-semibold text-ink">
                {active ? "Showing availability" : "See availability"} <ArrowRightIcon width={14} height={14} className="transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ---------- Route: every train, seats on demand ----------

function RouteView({ from, to, date, cls, quota, onDate }: { from: string; to: string; date: string; cls: string; quota: string; onDate: (d: string) => void }) {
  const req = useMemo(() => ({ url: `/api/trains/between?${new URLSearchParams({ from, to, date })}` }), [from, to, date]);
  const { state, refresh } = useApi<TrainsBetweenResult>(req);
  return (
    <ApiResult state={state} onRetry={refresh} skeleton={<ResultSkeleton rows={6} />}>
      {(r, meta, refreshing) => (
        <div className="space-y-4">
          <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} />
          {r.trains.length === 0 ? (
            <NoTrains r={r} date={date} onDate={onDate} />
          ) : (
            <>
              <p className="text-[14px] text-slate-600">
                <strong className="font-semibold text-ink">{r.trains.length} trains</strong> from {r.from.label} to {r.to.label}. Check seats on any of them{cls === "ANY" ? " across every class" : ` in ${cls}`}.
              </p>
              <ul className="space-y-3">
                {r.trains.map((t) => <RouteTrain key={t.trainNumber} t={t} date={date} cls={cls} quota={quota} />)}
              </ul>
            </>
          )}
        </div>
      )}
    </ApiResult>
  );
}

/** Nothing leaves that day: offer the next date that has trains */
export function NoTrains({ r, date, onDate }: { r: TrainsBetweenResult; date: string; onDate: (d: string) => void }) {
  return (
    <EmptyState art="between" title={`No trains on ${day(date)}`}>
      <p>No train leaves {r.from.label} for {r.to.label} that day.</p>
      {r.nextDate ? (
        <button
          type="button"
          onClick={() => onDate(r.nextDate!)}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-signal hover:text-ink"
        >
          Show {r.nextCount} train{r.nextCount === 1 ? "" : "s"} on {day(r.nextDate)} <ArrowRightIcon width={15} height={15} />
        </button>
      ) : (
        <p className="mt-2">No trains run on this route in the next two weeks.</p>
      )}
    </EmptyState>
  );
}

function RouteTrain({ t, date, cls, quota }: { t: TrainBetween; date: string; cls: string; quota: string }) {
  const [open, setOpen] = useState(false);
  const full = `/seat-availability?${new URLSearchParams({ train: t.trainNumber, from: t.from.code, to: t.to.code, date, class: cls, quota })}`;
  return (
    <li data-reveal className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-ink px-2 py-0.5 font-mono text-[13px] font-bold text-signal">{t.trainNumber}</span>
            <span className="truncate font-semibold text-ink">{t.trainName}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[13px] text-slate-600">
            <span><strong className="font-mono text-[16px] text-ink">{t.departure}</strong> {t.from.code}</span>
            <span className="h-px w-8 bg-slate-300" aria-hidden />
            <span className="font-mono text-[12px] text-slate-400">{fmtDuration(t.durationMinutes)}</span>
            <span className="h-px w-8 bg-slate-300" aria-hidden />
            <span>
              <strong className="font-mono text-[16px] text-ink">{t.arrival}</strong>
              {t.arrivalDayOffset ? <sup className="ml-0.5 font-mono text-[10px] font-bold text-amber-700">+{t.arrivalDayOffset}</sup> : null} {t.to.code}
            </span>
          </div>
        </div>
        <RunDays days={t.runDays} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cx("rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors", open ? "bg-slate-100 text-ink" : "bg-ink text-white hover:bg-signal hover:text-ink")}
          >
            {open ? "Hide seats" : "Check seats"}
          </button>
          <Link href={full} className="rounded-full border border-slate-200 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-ink hover:text-ink">Full calendar</Link>
        </div>
      </div>
      {open && <SeatsPeek t={t} date={date} cls={cls} quota={quota} />}
    </li>
  );
}

/** Seats for one train on the chosen date, in one class or all of them */
function SeatsPeek({ t, date, cls, quota }: { t: TrainBetween; date: string; cls: string; quota: string }) {
  const req = useMemo(() => ({ url: `/api/trains/availability?${new URLSearchParams({ train: t.trainNumber, from: t.from.code, to: t.to.code, date, class: cls, quota })}` }), [t, date, cls, quota]);
  const { state, refresh } = useApi<AllClassesAvailability | SeatAvailability>(req);
  if (state.status === "loading" || state.status === "idle") return <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  if (state.status === "error") return <div className="mt-4"><ErrorState code={state.code} message={state.message} onRetry={refresh} /></div>;

  const d = state.data;
  const rows = "classes" in d
    ? d.classes.map((c) => ({ cls: c.travelClass, name: c.className, fare: c.fare, cell: c.days.find((x) => x.date === date) ?? c.days[0], error: c.error }))
    : [{ cls: d.travelClass, name: "", fare: undefined, cell: d.days.find((x) => x.date === date) ?? d.days[0], error: undefined }];
  return (
    <div className="animate-fade-up mt-4 space-y-2 border-t border-dashed border-slate-200 pt-4">
      {d.requestedDate && <p className="text-[12.5px] font-medium text-amber-800">Doesn&apos;t leave on {day(d.requestedDate)}; showing its next run.</p>}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {rows.map((r) => {
          const s = r.cell ? readStatus(r.cell.status, r.cell.type) : undefined;
          return (
            <li key={r.cls} className={cx("rounded-xl border px-3 py-2", r.cell ? TONE[r.cell.type].tile : "border-slate-200 bg-slate-50 text-slate-400")}>
              <p className="flex items-center justify-between font-mono text-[12px] font-bold">
                {r.cls}
                {r.fare ? <span className="font-semibold opacity-70">{inr(r.fare)}</span> : null}
              </p>
              <p className="mt-0.5 font-mono text-[15px] font-bold leading-tight">{s ? s.big : "—"}</p>
              <p className="text-[11px] opacity-70">{r.error ? "Unavailable" : r.cell ? `${s?.small ?? TONE[r.cell.type].label} · ${day(r.cell.date)}` : ""}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
