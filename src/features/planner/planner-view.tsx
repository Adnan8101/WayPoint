"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AllClassesAvailability, ApiResponse, AvailabilityType, PlanConnection, PlanConnections, PlanDirect, SeatAvailability, SeatCheck, SeatCheckResult, TrainBetween } from "@/lib/types";
import { useApi } from "@/lib/client/use-api";
import { addRecent } from "@/lib/client/recent";
import { seatKey } from "@/lib/planner";
import { addDays } from "@/lib/dates";
import { todayIST } from "@/lib/dates";
import { cx, fmtDate, fmtDuration } from "@/lib/format";
import { PlannerForm } from "@/components/forms";
import { SearchPanel, Section } from "@/components/page-header";
import { EmptyState, ErrorState, ResultSkeleton, Skeleton } from "@/components/result-states";
import { ApiResult } from "@/components/api-result";
import { ShareButton } from "@/components/ui";
import { RecentList } from "@/components/recent-list";
import { ArrowRightIcon } from "@/components/icons";
import { RunDays } from "@/features/trains/train-parts";

const BATCH = 10;
const day = (d: string) => fmtDate(d, { weekday: "short", day: "numeric", month: "short" });
const GOOD: AvailabilityType[] = ["AVAILABLE", "RAC"];

type Cal = { cls: string; days: SeatAvailability["days"] }[];

/** Normalise a single-class or all-classes answer to per-class calendars */
function calendars(d: AllClassesAvailability | SeatAvailability): Cal {
  return "classes" in d ? d.classes.filter((c) => !c.error).map((c) => ({ cls: c.travelClass, days: c.days })) : [{ cls: d.travelClass, days: d.days }];
}

/** Seat status as a short chip label */
function short(status: string, type: AvailabilityType): string {
  const avl = status.match(/AVAILABLE-?0*(\d+)/i);
  if (avl) return `AVL ${avl[1]}`;
  if (type === "WAITLIST" || type === "RAC") {
    const part = status.split("/").at(-1) ?? status;
    return part.replace(/([A-Z]+)0*(\d+)/, "$1 $2");
  }
  return type === "REGRET" ? "Regret" : status;
}

interface Verdict {
  state: "pending" | "today" | "nearby" | "waitlist" | "unknown";
  /** Seats on the date shown */
  date?: string;
  seats: { cls: string; label: string; type: AvailabilityType }[];
  /** Every date in the window with seats, for the day chips */
  goodDates: string[];
}

/** Where a train stands: seats on the date, seats a few days away, or waitlist only */
function verdict(r: SeatCheckResult | undefined, date: string, from: string, to: string): Verdict {
  if (!r) return { state: "pending", seats: [], goodDates: [] };
  if (!r.ok || !r.data) return { state: "unknown", seats: [], goodDates: [] };
  const cal = calendars(r.data);
  const inWindow = (d: string) => d >= from && d <= to;
  const good = new Set<string>();
  for (const c of cal) for (const x of c.days) if (GOOD.includes(x.type) && inWindow(x.date)) good.add(x.date);
  const seatsOn = (d: string) =>
    cal.flatMap((c) => c.days.filter((x) => x.date === d && GOOD.includes(x.type)).map((x) => ({ cls: c.cls, label: short(x.status, x.type), type: x.type })));
  if (good.has(date)) return { state: "today", date, seats: seatsOn(date), goodDates: [...good].sort() };
  if (good.size) {
    // Nearest date to the one asked for; earlier wins a tie
    const best = [...good].sort((a, b) => Math.abs(Date.parse(a) - Date.parse(date)) - Math.abs(Date.parse(b) - Date.parse(date)) || a.localeCompare(b))[0];
    return { state: "nearby", date: best, seats: seatsOn(best), goodDates: [...good].sort() };
  }
  const anyDay = cal.flatMap((c) => c.days.filter((x) => inWindow(x.date)).map((x) => ({ cls: c.cls, label: short(x.status, x.type), type: x.type, date: x.date })));
  const near = anyDay.sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(date)) - Math.abs(Date.parse(b.date) - Date.parse(date)));
  return { state: "waitlist", date: near[0]?.date, seats: near.filter((x) => x.date === near[0]?.date), goodDates: [] };
}

async function checkSeats(checks: SeatCheck[], quota: string): Promise<SeatCheckResult[]> {
  try {
    const res = await fetch("/api/planner/seats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checks, quota }) });
    const r = (await res.json()) as ApiResponse<SeatCheckResult[]>;
    return r.ok ? r.data : checks.map((c) => ({ key: seatKey(c), ok: false, error: r.error.message }));
  } catch {
    return checks.map((c) => ({ key: seatKey(c), ok: false, error: "Network error" }));
  }
}

export function PlannerView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = Object.fromEntries(["from", "to", "date", "class", "quota", "flex", "show"].map((k) => [k, params.get(k) ?? ""]));
  const ready = Boolean(q.from && q.to && q.date);
  const cls = q.class || "ANY";
  const quota = q.quota || "GN";
  const flex = Math.min(5, Math.max(0, Number(q.flex || 3)));
  const onlySeats = q.show !== "all";
  const today = todayIST();
  const winFrom = [addDays(q.date || today, -flex), today].sort().at(-1)!;
  const winTo = addDays(q.date || today, flex);

  const setParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const directReq = useMemo(() => (ready ? { url: `/api/planner/direct?${new URLSearchParams({ from: q.from, to: q.to, date: q.date })}` } : null), [ready, q.from, q.to, q.date]);
  const direct = useApi<PlanDirect>(directReq);
  const connReq = useMemo(() => (ready ? { url: `/api/planner/connections?${new URLSearchParams({ from: q.from, to: q.to, date: q.date })}` } : null), [ready, q.from, q.to, q.date]);
  const conns = useApi<PlanConnections>(connReq);

  // Check seats for every direct train, a batch at a time, from the start of the window
  const [seats, setSeats] = useState<Record<string, SeatCheckResult>>({});
  const trains = direct.state.status === "success" ? direct.state.data.trains : [];
  const checks = useMemo<SeatCheck[]>(() => trains.map((t) => ({ train: t.trainNumber, from: t.from.code, to: t.to.code, date: winFrom, class: cls })), [trains, winFrom, cls]);
  useEffect(() => {
    if (!checks.length) return;
    let live = true;
    setSeats({});
    (async () => {
      for (let i = 0; i < checks.length; i += BATCH) {
        const got = await checkSeats(checks.slice(i, i + BATCH), quota);
        if (!live) return;
        setSeats((cur) => ({ ...cur, ...Object.fromEntries(got.map((r) => [r.key, r])) }));
      }
    })();
    return () => {
      live = false;
    };
  }, [checks, quota]);

  useEffect(() => {
    if (direct.state.status === "success") addRecent({ kind: "planner", label: `${direct.state.data.from.label} → ${direct.state.data.to.label} · ${fmtDate(q.date, { day: "numeric", month: "short" })}`, href: `/planner?${params.toString()}` });
  }, [direct.state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = trains.map((t, i) => ({ t, v: verdict(seats[seatKey(checks[i])], q.date, winFrom, winTo) }));
  const pending = rows.filter((r) => r.v.state === "pending").length;
  const groups = {
    today: rows.filter((r) => r.v.state === "today").sort((a, b) => a.t.departure.localeCompare(b.t.departure)),
    nearby: rows.filter((r) => r.v.state === "nearby").sort((a, b) => Math.abs(Date.parse(a.v.date!) - Date.parse(q.date)) - Math.abs(Date.parse(b.v.date!) - Date.parse(q.date)) || a.t.departure.localeCompare(b.t.departure)),
    waitlist: rows.filter((r) => r.v.state === "waitlist" || r.v.state === "unknown"),
  };
  // Trains with seats on each day of the window
  const byDay = useMemo(() => {
    const out: { date: string; n: number }[] = [];
    for (let d = winFrom; d <= winTo; d = addDays(d, 1)) out.push({ date: d, n: rows.filter((r) => r.v.goodDates.includes(d)).length });
    return out;
  }, [rows, winFrom, winTo]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <SearchPanel>
        <PlannerForm key={params.toString()} initial={q} />
      </SearchPanel>
      <Section>
        {!ready ? (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <EmptyState art="route" title="Plan a trip that actually has seats">
              Tell us where and when. We check every direct train for seats on your date, find the nearest dates with seats if it&apos;s full, and suggest journeys with one change of train when that works better.
            </EmptyState>
            <RecentList kinds={["planner"]} />
          </div>
        ) : (
          <div className="space-y-10">
            <ApiResult
              state={direct.state}
              onRetry={direct.refresh}
              skeleton={<ResultSkeleton rows={6} />}
            >
              {(d) => (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="label">Journey planner</p>
                      <h2 className="font-display mt-2 text-[32px] font-bold text-ink sm:text-[40px]">{d.from.label} <span className="text-signal">→</span> {d.to.label}</h2>
                      <p className="mt-1 text-[15px] text-slate-500">
                        {day(q.date)}{flex ? ` ± ${flex} day${flex === 1 ? "" : "s"}` : ""} · {cls === "ANY" ? "any class" : cls} · {d.trains.length} direct trains on this route
                      </p>
                    </div>
                    <ShareButton title={`Trains ${d.from.label} to ${d.to.label}`} />
                  </div>

                  {/* Seats per day across the window */}
                  <div data-reveal className="grain relative overflow-hidden rounded-[24px] bg-ink p-5 text-white sm:p-6">
                    <div className="grid-lines absolute inset-0" aria-hidden />
                    <div className="relative flex flex-wrap items-center justify-between gap-3">
                      <p className="label !text-signal">{pending ? `Checking seats · ${trains.length - pending} of ${trains.length}` : "Trains with seats, by day"}</p>
                      {pending > 0 && <span className="size-4 animate-spin rounded-full border-2 border-signal border-t-transparent" aria-hidden />}
                    </div>
                    <ul className="relative mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-11">
                      {byDay.map((x) => (
                        <li key={x.date}>
                          <button
                            type="button"
                            onClick={() => setParams({ date: x.date })}
                            className={cx(
                              "w-full rounded-xl px-2 py-2.5 text-center transition-all hover:-translate-y-0.5",
                              x.date === q.date ? "bg-signal text-ink" : x.n ? "bg-white/[0.08] text-white hover:bg-white/[0.14]" : "bg-white/[0.03] text-white/35",
                            )}
                          >
                            <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-wider opacity-70">{fmtDate(x.date, { weekday: "short" })}</span>
                            <span className="block font-mono text-[13px] font-bold">{fmtDate(x.date, { day: "numeric", month: "short" })}</span>
                            <span className="mt-0.5 block text-[11px]">{pending && !x.n ? "…" : `${x.n} with seats`}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-[14px] text-slate-600">
                      <strong className="font-semibold text-ink">{groups.today.length}</strong> with seats on {day(q.date)} ·{" "}
                      <strong className="font-semibold text-ink">{groups.nearby.length}</strong> on a nearby date
                    </p>
                    <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-medium text-slate-700">
                      <input type="checkbox" checked={onlySeats} onChange={(e) => setParams({ show: e.target.checked ? "seats" : "all" })} className="size-4 accent-[var(--color-ink)]" />
                      Only trains with seats
                    </label>
                  </div>

                  <Group title={`Seats on ${day(q.date)}`} rows={groups.today} cls={cls} quota={quota} />
                  <Group title="Seats on a nearby date" note="Full on your date, open close to it." rows={groups.nearby} cls={cls} quota={quota} />
                  {!onlySeats && <Group title="Waitlist only" note="No confirmed or RAC seats in your window." rows={groups.waitlist} cls={cls} quota={quota} />}
                  {pending > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: Math.min(pending, 4) }, (_, i) => <Skeleton key={i} className="h-28 rounded-[20px]" />)}</div>
                  )}
                  {!pending && !groups.today.length && !groups.nearby.length && (
                    <EmptyState title="No direct seats in your window">
                      Every direct train is waitlisted between {day(winFrom)} and {day(winTo)}. Widen the dates, try another class, or take one of the journeys with a change below.
                    </EmptyState>
                  )}
                </div>
              )}
            </ApiResult>

            <Connections state={conns.state} retry={conns.refresh} cls={cls} quota={quota} />
          </div>
        )}
      </Section>
    </>
  );
}

function Group({ title, note, rows, cls, quota }: { title: string; note?: string; rows: { t: TrainBetween & { onDate: boolean }; v: Verdict }[]; cls: string; quota: string }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display text-[24px] font-bold text-ink">{title} <span className="font-mono text-[15px] text-slate-400">{rows.length}</span></h3>
        {note && <p className="text-[13.5px] text-slate-500">{note}</p>}
      </div>
      <ul className="space-y-3">
        {rows.map(({ t, v }) => <TrainCard key={t.trainNumber} t={t} v={v} cls={cls} quota={quota} />)}
      </ul>
    </section>
  );
}

function TrainCard({ t, v, cls, quota }: { t: TrainBetween; v: Verdict; cls: string; quota: string }) {
  const href = `/seat-availability?${new URLSearchParams({ train: t.trainNumber, from: t.from.code, to: t.to.code, date: v.date ?? "", class: cls, quota })}`;
  const tone = v.state === "today" ? "border-l-brand-500" : v.state === "nearby" ? "border-l-signal" : "border-l-slate-300";
  return (
    <li data-reveal className={cx("rounded-[20px] border border-l-4 border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5", tone)}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-ink px-2 py-0.5 font-mono text-[13px] font-bold text-signal">{t.trainNumber}</span>
            <span className="truncate font-semibold text-ink">{t.trainName}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-slate-600">
            <span><strong className="font-mono text-[16px] text-ink">{t.departure}</strong> {t.from.code}</span>
            <span className="font-mono text-[12px] text-slate-400">— {fmtDuration(t.durationMinutes)} —</span>
            <span>
              <strong className="font-mono text-[16px] text-ink">{t.arrival}</strong>
              {t.arrivalDayOffset ? <sup className="ml-0.5 font-mono text-[10px] font-bold text-amber-700">+{t.arrivalDayOffset}</sup> : null} {t.to.code}
            </span>
          </div>
        </div>
        <RunDays days={t.runDays} />
        <Link href={href} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-signal hover:text-ink">
          Details <ArrowRightIcon width={14} height={14} />
        </Link>
      </div>
      {v.date && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 pt-3">
          <span className={cx("font-mono text-[11px] font-semibold uppercase tracking-wider", v.state === "nearby" ? "text-amber-700" : v.state === "today" ? "text-brand-700" : "text-slate-500")}>
            {v.state === "today" ? "Seats on your date" : v.state === "nearby" ? `Seats on ${day(v.date)}` : `${day(v.date)}`}
          </span>
          {v.seats.map((s) => (
            <span key={s.cls} className={cx("rounded-lg px-2 py-1 font-mono text-[12px] font-bold ring-1 ring-inset", s.type === "AVAILABLE" ? "bg-brand-50 text-brand-800 ring-brand-200" : s.type === "RAC" ? "bg-sky-50 text-sky-800 ring-sky-200" : "bg-amber-50 text-amber-900 ring-amber-200")}>
              {s.cls} · {s.label}
            </span>
          ))}
          {v.goodDates.length > 1 && <span className="text-[12px] text-slate-400">also {v.goodDates.filter((d) => d !== v.date).slice(0, 3).map((d) => fmtDate(d, { day: "numeric", month: "short" })).join(", ")}</span>}
        </div>
      )}
    </li>
  );
}

// ---------- With one change ----------

function Connections({ state, retry, cls, quota }: { state: ReturnType<typeof useApi<PlanConnections>>["state"]; retry: () => void; cls: string; quota: string }) {
  return (
    <section className="space-y-4">
      <div>
        <p className="label">Or change trains</p>
        <h3 className="font-display mt-2 text-[28px] font-bold text-ink">With one change</h3>
      </div>
      {state.status === "loading" || state.status === "idle" ? (
        <div className="grid gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-[20px]" />)}</div>
      ) : state.status === "error" ? (
        <ErrorState code={state.code} message={state.message} onRetry={retry} />
      ) : state.data.options.length === 0 ? (
        <p className="text-[14px] text-slate-500">No sensible one-change journeys leave that day{state.data.hubs.length ? ` via ${state.data.hubs.map((h) => h.name).join(", ")}` : ""}.</p>
      ) : (
        <>
          <p className="text-[13.5px] text-slate-500">Checked interchanges: {state.data.hubs.map((h) => `${h.name} (${h.code})`).join(" · ")}. Waits between 1 and 12 hours.</p>
          <ul className="space-y-3">
            {state.data.options.map((c, i) => <ConnectionCard key={`${c.legs[0].trainNumber}-${c.legs[1].trainNumber}-${i}`} c={c} cls={cls} quota={quota} />)}
          </ul>
        </>
      )}
    </section>
  );
}

function ConnectionCard({ c, cls, quota }: { c: PlanConnection; cls: string; quota: string }) {
  const [res, setRes] = useState<SeatCheckResult[] | "loading">();
  const check = async () => {
    setRes("loading");
    setRes(await checkSeats(c.legs.map((l) => ({ train: l.trainNumber, from: l.from.code, to: l.to.code, date: l.date, class: cls })), quota));
  };
  return (
    <li data-reveal className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">
          Via <strong className="font-semibold text-ink">{c.via.name}</strong> · {fmtDuration(c.totalMinutes)} in all · {fmtDuration(c.waitMinutes)} wait
        </p>
        {res === undefined && (
          <button type="button" onClick={check} className="rounded-full bg-ink px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-signal hover:text-ink">Check seats</button>
        )}
      </div>
      <ol className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
        {c.legs.map((l, i) => {
          const r = Array.isArray(res) ? res[i] : undefined;
          const cal = r?.ok && r.data ? calendars(r.data) : [];
          const onDay = cal.flatMap((x) => x.days.filter((d) => d.date === l.date).map((d) => ({ cls: x.cls, label: short(d.status, d.type), type: d.type })));
          return (
            <li key={i} className={cx("rounded-2xl bg-slate-50 p-3.5", i === 1 && "md:col-start-3")}>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-[12px] font-bold text-signal">{l.trainNumber}</span>
                <span className="truncate text-[13.5px] font-semibold text-ink">{l.trainName}</span>
              </div>
              <p className="mt-1.5 text-[13px] text-slate-600">
                <strong className="font-mono text-ink">{l.departure}</strong> {l.from.code} → <strong className="font-mono text-ink">{l.arrival}</strong> {l.to.code}
                <span className="ml-1 text-slate-400">· {day(l.date)}</span>
              </p>
              {res === "loading" && <Skeleton className="mt-2 h-6 w-2/3" />}
              {r && !r.ok && <p className="mt-2 text-[12px] text-slate-400">{r.error}</p>}
              {onDay.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {onDay.map((s) => (
                    <span key={s.cls} className={cx("rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold ring-1 ring-inset", GOOD.includes(s.type) ? "bg-brand-50 text-brand-800 ring-brand-200" : "bg-amber-50 text-amber-900 ring-amber-200")}>
                      {s.cls} · {s.label}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
        <li className="hidden text-center md:col-start-2 md:row-start-1 md:block" aria-hidden>
          <span className="inline-flex flex-col items-center gap-1 font-mono text-[11px] text-slate-400">
            <span className="rounded-full bg-signal-soft px-2 py-0.5 font-semibold text-amber-800">{c.via.code}</span>
            change
          </span>
        </li>
      </ol>
    </li>
  );
}
