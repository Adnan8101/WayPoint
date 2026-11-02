import Link from "next/link";
import type { ComponentType, CSSProperties, SVGProps } from "react";
import { HomeSearch } from "@/features/home/home-search";
import { DepartureBoard } from "@/features/home/departure-board";
import { LiveTicker } from "@/features/home/live-ticker";
import { RecentList } from "@/components/recent-list";
import { RouteArcs, Rider } from "@/components/page-header";
import { SpotlightLink } from "@/components/motion";
import { Scene, type SceneKind } from "@/components/illustrations";
import { ArrowRightIcon, BanIcon, BerthIcon, BuildingIcon, ClockIcon, MapIcon, SeatIcon, PlaneIcon, RouteIcon, SearchIcon, TrainIcon } from "@/components/icons";
import { SITE } from "@/lib/site";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const MORE: { title: string; line: string; href: string; icon: Icon }[] = [
  { title: "Journey planner", line: "Trains with seats on your date, nearby dates or one change", href: "/planner", icon: RouteIcon },
  { title: "Seats & fare", line: "Availability across the coming days, every class's fare", href: "/seat-availability", icon: SeatIcon },
  { title: "Vacant berths", line: "Free berths after the chart, coach by coach", href: "/chart-vacancy", icon: BerthIcon },
  { title: "Trains between stations", line: "Every train on a route, with fares", href: "/trains-between-stations", icon: SearchIcon },
  { title: "Cancelled trains", line: "Is yours on today's list?", href: "/cancelled-trains", icon: BanIcon },
  { title: "Train schedule", line: "Full station-wise timetable", href: "/train-schedule", icon: ClockIcon },
  { title: "Airport boards", line: "Live arrivals and departures", href: "/airports", icon: BuildingIcon },
  { title: "Flight tracker", line: "Route and position on a map", href: "/flight-tracker", icon: MapIcon },
];

const FACTS = [
  { k: "PNR", v: "Berth and chart status" },
  { k: "Train no.", v: "Live position and delay" },
  { k: "Flight no.", v: "Gate, terminal and belt" },
];

const LEGS: { title: string; tag: string; href: string; art: SceneKind; dark?: boolean }[] = [
  { title: "Railway stations", tag: "Concourse", href: "/railway-stations", art: "station", dark: true },
  { title: "Train routes", tag: "On the line", href: "/train-route", art: "route" },
  { title: "Airport boards", tag: "Terminal", href: "/airports", art: "airport", dark: true },
  { title: "Weather & time", tag: "Arrival", href: "/travel-information", art: "travel" },
];

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export default function Home() {
  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="grain relative overflow-hidden bg-ink text-white">
        <div className="glow-signal absolute inset-0" aria-hidden />
        <div className="grid-lines absolute inset-0" aria-hidden />
        <RouteArcs className="pointer-events-none absolute -left-24 bottom-0 h-[380px] w-[70%] -scale-x-100 opacity-60" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-14 xl:grid-cols-[1fr_auto]">
            <div>
              <p className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3.5 text-[13px] text-white/70">
                <span className="rounded-full bg-signal px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-ink">Live</span>
                Railways and airlines, one board
              </p>
              <h1 className="font-display animate-fade-up mt-7 text-[50px] font-bold sm:text-[84px]" style={{ animationDelay: "90ms" }}>
                Know where
                <br />
                you stand,{" "}
                <span className="relative inline-block text-signal">
                  before
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none" aria-hidden preserveAspectRatio="none">
                    <path d="M2 8c40-6 120-8 196-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="draw" style={{ ["--len" as string]: 220, ["--delay" as string]: ".7s" }} />
                  </svg>
                </span>{" "}
                you leave.
              </h1>
              <p className="animate-fade-up mt-7 max-w-xl text-[17.5px] leading-relaxed text-white/60" style={{ animationDelay: "180ms" }}>
                Check a PNR, find your train or look up a flight in seconds. Live, estimated and timetable times are always labelled, so you know exactly what you&apos;re looking at.
              </p>
              <dl className="animate-fade-up mt-10 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06]" style={{ animationDelay: "260ms" }}>
                {FACTS.map((f) => (
                  <div key={f.k} className="bg-ink/80 px-4 py-3.5">
                    <dt className="font-mono text-[15px] font-semibold text-signal sm:text-[17px]">{f.k}</dt>
                    <dd className="mt-1 text-[12.5px] leading-snug text-white/50">{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative hidden xl:block">
              {/* Radar sweep behind the board */}
              <div className="pointer-events-none absolute left-1/2 top-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full [mask-image:radial-gradient(circle,#000_30%,transparent_70%)]" aria-hidden>
                <div className="absolute inset-0 rounded-full bg-[repeating-radial-gradient(circle,transparent_0_59px,rgb(255_255_255/0.05)_60px_61px)]" />
                <div className="absolute inset-0 animate-[spin_9s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,rgb(255_194_26/0.16),transparent_22%)]" />
              </div>
              <div
                className="animate-fade-up relative transition-transform duration-700 ease-[var(--ease-out-expo)] [transform:perspective(1400px)_rotateY(-10deg)_rotateX(5deg)] hover:[transform:perspective(1400px)_rotateY(0)_rotateX(0)]"
                style={{ animationDelay: "300ms" }}
              >
                <DepartureBoard />
              </div>
            </div>
          </div>

          <div className="animate-fade-up mt-14 sm:mt-16" style={{ animationDelay: "360ms" }}>
            <HomeSearch />
          </div>
        </div>
      </section>

      {/* ───────── Live ticker ───────── */}
      <LiveTicker />

      {/* ───────── 01 Start here ───────── */}
      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-6">
        <SectionHead index="01" title="Start here" sub="The three things people check most, a tap away." />
        <div className="grid gap-4 lg:grid-cols-12 lg:grid-rows-2">
          <SpotlightLink
            href="/pnr-status"
            data-reveal
            className="group flex flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] lg:col-span-7 lg:row-span-2"
          >
            <div className="flex flex-1 flex-col gap-8 p-7 sm:p-9 md:flex-row md:items-center">
              <div className="flex-1">
                <CardTag>Trains · PNR</CardTag>
                <h3 className="font-display mt-5 text-[36px] font-bold text-ink sm:text-[44px]">Confirmed, RAC or waiting?</h3>
                <p className="mt-3 max-w-sm text-[15.5px] leading-relaxed text-slate-500">
                  See each passenger&apos;s current status and berth, and whether the chart has been prepared.
                </p>
                <CardCta>Check PNR status</CardCta>
              </div>
              <TicketArt />
            </div>
            <div className="grid grid-cols-3 border-t border-dashed border-slate-200 bg-slate-50/70 text-[12.5px]">
              {[
                ["CNF", "Confirmed berth", "text-brand-700"],
                ["RAC", "Shared berth", "text-sky-700"],
                ["WL", "Waiting list", "text-amber-700"],
              ].map(([c, l, tone]) => (
                <div key={c} className="border-r border-slate-200 px-5 py-4 last:border-0 sm:px-7">
                  <p className={`font-mono text-[15px] font-bold ${tone}`}>{c}</p>
                  <p className="mt-0.5 text-slate-500">{l}</p>
                </div>
              ))}
            </div>
          </SpotlightLink>

          <SpotlightLink
            href="/train-status"
            data-reveal
            style={d(100)}
            className="grain group relative flex flex-col overflow-hidden rounded-[26px] bg-ink p-7 text-white shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:p-8 lg:col-span-5"
          >
            <div className="grid-lines absolute inset-0 opacity-70" aria-hidden />
            <div className="relative flex items-start justify-between">
              <CardTag dark>Trains · Live</CardTag>
              <TrainIcon width={22} height={22} className="text-signal" />
            </div>
            <h3 className="font-display relative mt-5 text-[30px] font-bold">Where&apos;s my train</h3>
            <p className="relative mt-2 max-w-xs text-[14.5px] leading-relaxed text-white/55">Live position, delay and the next stop, updated every few minutes.</p>
            <TrackArt />
            <CardCta dark>Track a train</CardCta>
          </SpotlightLink>

          <SpotlightLink
            href="/flight-status"
            data-reveal
            style={d(200)}
            className="group relative flex flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-[linear-gradient(160deg,#fff_40%,var(--color-signal-soft))] p-7 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:p-8 lg:col-span-5"
          >
            <div className="flex items-start justify-between">
              <CardTag>Flights · Status</CardTag>
              <PlaneIcon width={22} height={22} className="text-ink" />
            </div>
            <h3 className="font-display mt-5 text-[30px] font-bold text-ink">Flight status</h3>
            <p className="mt-2 max-w-xs text-[14.5px] leading-relaxed text-slate-500">Gate, terminal, delay and actual times for any flight number.</p>
            <FlightArt />
            <CardCta>Check a flight</CardCta>
          </SpotlightLink>
        </div>
      </section>

      {/* ───────── 02 More tools ───────── */}
      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <SectionHead index="02" title="Everything else" sub="Timetables, boards, maps and the small stuff that saves a trip." />
        <ul className="grid border-t border-slate-300/70 lg:grid-cols-2 lg:gap-x-10">
          {MORE.map((m, i) => (
            <li key={m.href} data-reveal style={d(i * 60)} className="border-b border-slate-300/70">
              <Link href={m.href} className="group relative flex items-center gap-5 overflow-hidden px-2 py-6 sm:gap-6 sm:px-4">
                <span className="absolute inset-0 origin-left scale-x-0 rounded-2xl bg-ink transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100" aria-hidden />
                <span className="relative w-7 font-mono text-[12px] text-slate-400 transition-colors group-hover:text-signal">0{i + 1}</span>
                <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-ink transition-all duration-500 group-hover:rotate-[-8deg] group-hover:border-transparent group-hover:bg-signal">
                  <m.icon width={20} height={20} />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="font-display block text-[21px] font-semibold text-ink transition-colors group-hover:text-white sm:text-[24px]">{m.title}</span>
                  <span className="block text-[14px] text-slate-500 transition-colors group-hover:text-white/55">{m.line}</span>
                </span>
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full border border-slate-300 text-slate-500 transition-all duration-500 group-hover:-rotate-45 group-hover:border-signal group-hover:bg-signal group-hover:text-ink">
                  <ArrowRightIcon width={16} height={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── Every leg ───────── */}
      <section className="mt-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead index="—" title="Every leg of the trip" sub="From the station concourse to the gate, and the weather on the other side." />
        </div>
        <ul className="no-scrollbar mx-auto flex max-w-7xl snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {LEGS.map((l, i) => (
            <li key={l.href} data-reveal style={d(i * 90)} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-auto">
              <SpotlightLink
                href={l.href}
                className={`group flex h-full flex-col overflow-hidden rounded-[26px] transition-[transform,box-shadow] duration-500 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lift)] ${l.dark ? "grain bg-ink text-white" : "border border-slate-200/80 bg-white text-ink shadow-[var(--shadow-card)]"}`}
              >
                <div className={`relative aspect-[4/3] p-5 ${l.dark ? "" : "dot-field"}`}>
                  {l.dark && <div className="grid-lines absolute inset-0" aria-hidden />}
                  <Scene kind={l.art} theme={l.dark ? "dark" : "light"} className="relative h-full w-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
                </div>
                <div className={`flex flex-1 items-end justify-between gap-3 border-t p-5 ${l.dark ? "border-white/[0.08]" : "border-slate-200/80"}`}>
                  <div>
                    <p className={`label ${l.dark ? "!text-signal" : ""}`}>{l.tag}</p>
                    <h3 className="font-display mt-2 text-[22px] font-bold">{l.title}</h3>
                  </div>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full transition-all duration-500 group-hover:-rotate-45 ${l.dark ? "bg-signal text-ink" : "bg-ink text-signal"}`}>
                    <ArrowRightIcon width={16} height={16} />
                  </span>
                </div>
              </SpotlightLink>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── 03 Your searches ───────── */}
      <section className="mx-auto mt-28 max-w-7xl px-4 sm:px-6">
        <SectionHead index="03" title="Pick up where you left off" sub="Your recent searches, kept only on this device." />
        <div data-reveal>
          <RecentList />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url }) }}
      />
    </>
  );
}

/* ───────── Pieces ───────── */

function SectionHead({ index, title, sub }: { index: string; title: string; sub: string }) {
  return (
    <div data-reveal className="mb-10 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <p className="label flex items-center gap-2"><span className="h-px w-6 bg-slate-400" aria-hidden />{index}</p>
        <h2 className="font-display mt-3 text-[40px] font-bold text-ink sm:text-[56px]">{title}</h2>
      </div>
      <p className="max-w-xs text-[15.5px] leading-relaxed text-slate-500 md:text-right">{sub}</p>
    </div>
  );
}

function CardTag({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] ${dark ? "bg-white/[0.08] text-white/70" : "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}

function CardCta({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`relative mt-auto inline-flex items-center gap-2 pt-7 text-[14.5px] font-semibold ${dark ? "text-signal" : "text-ink"}`}>
      <span className="relative">
        {children}
        <span className={`absolute -bottom-0.5 left-0 h-[2px] w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100 ${dark ? "bg-signal" : "bg-ink"}`} />
      </span>
      <ArrowRightIcon width={16} height={16} className="transition-transform duration-300 group-hover:translate-x-1.5" />
    </span>
  );
}

/** The shape of a PNR result: digits, journey, passengers by status. No sample data. */
function TicketArt() {
  const rows: [string, string][] = [["CNF", "bg-brand-500/25 text-brand-300"], ["RAC", "bg-sky-500/25 text-sky-300"], ["WL", "bg-amber-500/25 text-amber-300"]];
  return (
    <div className="relative mx-auto w-[270px] shrink-0 transition-transform duration-700 ease-[var(--ease-spring)] group-hover:-rotate-2 group-hover:scale-[1.03] md:rotate-3" aria-hidden>
      <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-[20px] bg-signal" />
      <div className="relative overflow-hidden rounded-[20px] bg-ink p-5 text-white">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">PNR</p>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={`h-5 w-[18px] rounded-[4px] ${i < 3 ? "bg-signal" : "bg-white/15"}`} />)}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-white" />
          <span className="relative h-px flex-1 border-t border-dashed border-white/25"><TrainIcon width={13} height={13} className="absolute -top-[7px] left-1/2 -translate-x-1/2 bg-ink px-0.5 text-signal" /></span>
          <span className="size-2.5 rounded-full border-2 border-white" />
        </div>
        <div className="relative my-4 h-px">
          <span className="absolute inset-x-0 border-t-2 border-dashed border-white/15" />
          <span className="absolute -left-[30px] -top-2.5 size-5 rounded-full bg-white" />
          <span className="absolute -right-[30px] -top-2.5 size-5 rounded-full bg-white" />
        </div>
        <ul className="space-y-2.5">
          {rows.map(([status, tone], i) => (
            <li key={status} className="flex items-center gap-3">
              <span className="size-5 rounded-full bg-white/15" />
              <span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${tone}`}>{status}</span>
              <span className="h-1.5 flex-1 rounded-full bg-white/10" style={{ maxWidth: `${70 - i * 15}%` }} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A train pulling through four stations */
function TrackArt() {
  return (
    <div className="relative mb-2 mt-9 px-2" aria-hidden>
      <div className="relative h-[3px] rounded-full bg-white/10">
        <div className="train-fill absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-signal/40 to-signal" />
        {[0, 33.333, 66.666, 100].map((p) => (
          <span key={p} className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-ink" style={{ left: `${p}%` }} />
        ))}
        <span className="train-run absolute top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="grid size-8 place-items-center rounded-full bg-signal text-ink shadow-[0_0_0_6px_rgb(255_194_26/0.15),0_0_24px_rgb(255_194_26/0.5)]">
            <TrainIcon width={15} height={15} />
          </span>
        </span>
      </div>
    </div>
  );
}

const FLIGHT_ARC = "M20 92 C 90 -8, 230 -8, 300 92";

/** A plane flying the arc between two airports */
function FlightArt() {
  return (
    <div className="relative mt-4" aria-hidden>
      <svg viewBox="0 0 320 110" className="w-full overflow-visible" fill="none">
        <path d={FLIGHT_ARC} stroke="#0b0d10" strokeOpacity=".15" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round" />
        <path d={FLIGHT_ARC} stroke="#0b0d10" strokeWidth="1.8" strokeLinecap="round" className="draw" style={{ ["--len" as string]: 420, ["--delay" as string]: ".4s" }} />
        <circle cx="20" cy="92" r="5" fill="#0b0d10" />
        <circle cx="300" cy="92" r="5" fill="#fff" stroke="#0b0d10" strokeWidth="2" />
        <g>
          <g transform="rotate(45) translate(-12 -12)">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" fill="#ffc21a" stroke="#0b0d10" strokeWidth="1.4" strokeLinejoin="round" />
          </g>
          <animateMotion path={FLIGHT_ARC} dur="6s" repeatCount="indefinite" rotate="auto" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines=".45 0 .55 1" />
        </g>
        <Rider path={FLIGHT_ARC} dur="6s" begin="3s" color="#0b0d10" r={2} />
      </svg>
    </div>
  );
}
