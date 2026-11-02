"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import type { AvailabilityType, ApiMeta, SeatAvailability, TrainFare } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { useStation } from "@/lib/client/lookups";
import { cx, fmtDate } from "@/lib/format";
import { CLASS_OPTIONS, QUOTA_OPTIONS, SeatsForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, ErrorState, Freshness, ResultSkeleton, Skeleton } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { Card, CopyButton, ShareButton } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { ArrowRightIcon } from "@/components/icons";

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

export function SeatsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = Object.fromEntries(["train", "from", "to", "date", "class", "quota"].map((k) => [k, params.get(k) ?? ""]));
  const ready = Boolean(q.train && q.from && q.to && q.date);
  const fromStation = useStation(q.from || undefined);
  const toStation = useStation(q.to || undefined);
  const cls = q.class || "3A";
  const quota = q.quota || "GN";

  const availReq = useMemo(() => (ready ? { url: `/api/trains/availability?${new URLSearchParams({ ...q, class: cls, quota })}` } : null), [ready, q.train, q.from, q.to, q.date, cls, quota]); // eslint-disable-line react-hooks/exhaustive-deps
  const fareQuota = quota === "TQ" ? "TQ" : "GN";
  const fareReq = useMemo(() => (ready ? { url: `/api/trains/fare?${new URLSearchParams({ train: q.train, from: q.from, to: q.to, quota: fareQuota })}` } : null), [ready, q.train, q.from, q.to, fareQuota]);
  const avail = useApi<SeatAvailability>(availReq);
  const fare = useApi<TrainFare>(fareReq);

  useEffect(() => {
    if (avail.state.status === "success") {
      addRecent({ kind: "seats", label: `${q.train} · ${q.from} → ${q.to} · ${cls}`, href: `/seat-availability?${new URLSearchParams({ ...q, class: cls, quota })}` });
    }
  }, [avail.state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(k, v);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  return (
    <>
      <SearchPanel>
        <SeatsForm key={params.toString()} initial={q} />
      </SearchPanel>
      <Section>
        {!ready ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <EmptyState art="seats" title="Will you get a berth?">
              Pick a train, your stations and a date. You&apos;ll see availability across the coming days and the fare for every class, with the full breakup.
            </EmptyState>
            <RecentList kinds={["seats"]} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-ink px-2.5 py-1 font-mono text-[15px] font-bold tracking-wider text-signal">{q.train}</span>
                  <CopyButton value={q.train} label="train number" />
                </div>
                <h2 className="font-display mt-3 text-[30px] font-bold text-ink sm:text-[38px]">
                  {fromStation?.name ?? q.from} <span className="text-signal">→</span> {toStation?.name ?? q.to}
                </h2>
                <p className="mt-1 text-[15px] text-slate-500">From {fmtDate(q.date, { weekday: "long", day: "numeric", month: "long" })}</p>
              </div>
              <ShareButton title={`Seats on ${q.train} from ${q.from} to ${q.to}`} />
            </div>

            {/* Class and quota switchers re-query in place */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Chips label="Class" value={cls} options={CLASS_OPTIONS.map((c) => ({ value: c.value, label: c.value }))} onChange={(v) => setParam("class", v)} />
              <Chips label="Quota" value={quota} options={QUOTA_OPTIONS} onChange={(v) => setParam("quota", v)} />
            </div>

            <ApiResult state={avail.state} onRetry={avail.refresh} skeleton={<CalendarSkeleton />}>
              {(d, meta, refreshing) => <Calendar d={d} meta={meta} refreshing={refreshing} refresh={avail.refresh} selected={q.date} />}
            </ApiResult>

            <div>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="label">Fare · {fareQuota === "TQ" ? "Tatkal" : "General"} quota</p>
                  <h3 className="font-display mt-2 text-[26px] font-bold text-ink">What it costs</h3>
                </div>
              </div>
              {fare.state.status === "error" ? (
                <ErrorState code={fare.state.code} message={fare.state.message} onRetry={fare.refresh} />
              ) : fare.state.status === "success" ? (
                <Fares f={fare.state.data} selected={cls} onPick={(c) => setParam("class", c)} />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-[20px]" />)}</div>
              )}
            </div>
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

function Calendar({ d, meta, refreshing, refresh, selected }: { d: SeatAvailability; meta: ApiMeta; refreshing: boolean; refresh: () => void; selected: string }) {
  const firstOpen = d.days.find((x) => x.type === "AVAILABLE");
  const counts = d.days.reduce<Record<string, number>>((m, x) => ((m[x.type] = (m[x.type] ?? 0) + 1), m), {});
  return (
    <div className="space-y-4">
      <Freshness meta={meta} onRefresh={refresh} refreshing={refreshing} staleAfterMs={10 * 60_000} />
      <div data-reveal className="grain relative overflow-hidden rounded-[24px] bg-ink p-5 text-white sm:p-7">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label !text-signal">{d.trainName || `Train ${d.trainNumber}`} · {d.travelClass} · {QUOTA_OPTIONS.find((o) => o.value === d.quota)?.label ?? d.quota}</p>
            <p className="font-display mt-2 text-[26px] font-bold sm:text-[32px]">
              {firstOpen ? <>Seats open from {fmtDate(firstOpen.date, { weekday: "short", day: "numeric", month: "short" })}</> : "No confirmed seats in this window"}
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
        {d.days.map((day, i) => {
          const s = readStatus(day.status, day.type);
          const isSel = day.date === selected;
          return (
            <li key={day.date} className="animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
              <div className={cx("relative h-full rounded-2xl border p-3.5 transition-transform hover:-translate-y-0.5", TONE[day.type].tile, isSel && "ring-2 ring-ink ring-offset-2 ring-offset-paper")}>
                {isSel && <span className="absolute -top-2 right-3 rounded-full bg-ink px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wider text-signal">Your date</span>}
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wider opacity-70">{fmtDate(day.date, { weekday: "short", day: "numeric", month: "short" })}</p>
                <p className="mt-2 font-mono text-[20px] font-bold leading-none">{s.big}</p>
                <p className="mt-1 text-[11.5px] opacity-70">{s.small ?? TONE[day.type].label}</p>
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
    <div className="space-y-3">
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
                  {c.breakup.map((b) => (
                    <span key={b.label} className={cx("h-full transition-[width] duration-700", SEGMENT[labels.indexOf(b.label) % SEGMENT.length])} style={{ width: `${(b.amount / c.total) * 100}%` }} />
                  ))}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
                  {c.breakup.map((b) => (
                    <div key={b.label} className="flex items-center justify-between gap-2">
                      <dt className="flex items-center gap-1.5 text-slate-500"><span className={cx("size-1.5 rounded-full", SEGMENT[labels.indexOf(b.label) % SEGMENT.length])} />{b.label}</dt>
                      <dd className="font-mono font-semibold text-ink">{inr(b.amount)}</dd>
                    </div>
                  ))}
                </dl>
                {c.berthTypes.length > 0 && <p className="mt-4 border-t border-dashed border-slate-200 pt-3 font-mono text-[11px] text-slate-400">Berths · {c.berthTypes.join(" · ")}</p>}
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] font-semibold text-ink">
                  {active ? "Showing availability" : "See availability"} <ArrowRightIcon width={14} height={14} className="transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {f.distanceKm ? <p className="text-[12.5px] text-slate-500">{f.distanceKm.toLocaleString("en-IN")} km · adult fare per passenger, including GST. <Link href={`/train-schedule?train=${f.trainNumber}`} className="font-medium text-ink underline decoration-signal decoration-2 underline-offset-2">See the timetable</Link></p> : null}
    </div>
  );
}
