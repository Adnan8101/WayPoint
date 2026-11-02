import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { HomeSearch } from "@/features/home/home-search";
import { RecentList } from "@/components/recent-list";
import { Faq } from "@/components/faq";
import { RouteArcs, RuleHeading } from "@/components/page-header";
import { ArrowRightIcon, BuildingIcon, ClockIcon, GlobeIcon, MapIcon, PlaneIcon, RouteIcon, SearchIcon, TicketIcon, TrainIcon } from "@/components/icons";
import { AIRPORTS } from "@/lib/data/airports";
import { POPULAR_TRAINS, STATIONS } from "@/lib/data/stations";
import { ANNOUNCEMENTS } from "@/lib/content";
import { SITE } from "@/lib/site";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const MAIN: { title: string; line: string; href: string; icon: Icon; tag: string }[] = [
  { title: "PNR status", line: "Confirmed, RAC or waiting? See each passenger's current status and berth.", href: "/pnr-status", icon: TicketIcon, tag: "Trains" },
  { title: "Where's my train", line: "Live position, delay and the next stop, updated every few minutes.", href: "/train-status", icon: TrainIcon, tag: "Trains" },
  { title: "Flight status", line: "Gate, terminal, delay and actual times for any flight number.", href: "/flight-status", icon: PlaneIcon, tag: "Flights" },
];

const MORE: { title: string; line: string; href: string; icon: Icon }[] = [
  { title: "Trains between stations", line: "Every train on a route", href: "/trains-between-stations", icon: SearchIcon },
  { title: "Train schedule", line: "Full station-wise timetable", href: "/train-schedule", icon: ClockIcon },
  { title: "Airport boards", line: "Live arrivals and departures", href: "/airports", icon: BuildingIcon },
  { title: "Flight tracker", line: "Route and position on a map", href: "/flight-tracker", icon: MapIcon },
  { title: "Train route", line: "Stops and distances", href: "/train-route", icon: RouteIcon },
  { title: "Weather & local time", line: "Know before you land", href: "/travel-information", icon: GlobeIcon },
];

const ROUTES = [["NDLS", "CSMT"], ["NDLS", "HWH"], ["SBC", "MAS"], ["NDLS", "LKO"], ["ADI", "MMCT"], ["SC", "SBC"]] as const;

export default function Home() {
  const airports = AIRPORTS.filter((a) => a.popular).slice(0, 8);
  const city = (c: string) => STATIONS.find((s) => s.code === c)?.city ?? c;

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="route-pattern absolute inset-0" aria-hidden />
        <RouteArcs className="pointer-events-none absolute -right-20 top-0 hidden h-[420px] w-[70%] lg:block" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-16 pt-14 sm:pb-20 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12.5px] font-medium text-slate-200">
            <span className="size-1.5 rounded-full bg-mint" aria-hidden /> Live data from railways and airlines
          </p>
          <h1 className="font-display mt-5 max-w-3xl text-[44px] font-semibold sm:text-[68px]">
            Know where you stand, <span className="text-mint">before you leave.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-slate-300">
            Check a PNR, find your train or look up a flight in seconds. Live, estimated and timetable times are always labelled, so you know exactly what you&apos;re looking at.
          </p>
          <div className="mt-10"><HomeSearch /></div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <RuleHeading sub="The three things people check most.">Start here</RuleHeading>
        <ul className="grid gap-4 md:grid-cols-3">
          {MAIN.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="group flex h-full flex-col rounded-[var(--radius-card)] border border-slate-200 bg-white p-6 shadow-[var(--shadow-card)] transition-all hover:border-brand-300 hover:shadow-[var(--shadow-pop)]">
                <div className="flex items-center justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-ink text-mint transition-colors group-hover:bg-brand-600 group-hover:text-white"><m.icon width={22} height={22} /></span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-medium text-slate-600">{m.tag}</span>
                </div>
                <h3 className="mt-6 text-[20px] font-semibold tracking-tight text-ink">{m.title}</h3>
                <p className="mt-1.5 flex-1 text-[14.5px] leading-relaxed text-slate-500">{m.line}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-brand-700">
                  Open <ArrowRightIcon width={15} height={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <RuleHeading>More tools</RuleHeading>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {MORE.map((m) => (
            <li key={m.href}>
              <Link href={m.href} className="group flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><m.icon width={19} height={19} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-ink">{m.title}</span>
                  <span className="block truncate text-[13px] text-slate-500">{m.line}</span>
                </span>
                <ArrowRightIcon width={16} height={16} className="hidden shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-14 grid max-w-6xl gap-4 px-4 lg:grid-cols-3">
        <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[15px] font-semibold text-ink">Popular trains</h2>
          <ul className="-mx-2 mt-3">
            {POPULAR_TRAINS.map((t) => (
              <li key={t.number}>
                <Link href={`/train-status?train=${t.number}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
                  <span className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-[12px] font-medium text-white">{t.number}</span>
                  <span className="truncate text-[14px] text-slate-700">{t.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="label">Busy routes</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {ROUTES.map(([f, t]) => (
                <li key={f + t}>
                  <Link href={`/trains-between-stations?from=${f}&to=${t}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[12.5px] text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800">
                    {city(f)} <span className="text-slate-400">→</span> {city(t)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-[15px] font-semibold text-ink">Popular airports</h2>
          <ul className="-mx-2 mt-3">
            {airports.map((a) => (
              <li key={a.iata}>
                <Link href={`/airports/${a.iata}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
                  <span className="w-10 font-mono text-[13px] font-semibold text-brand-700">{a.iata}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-slate-700">{a.city}</span>
                  <span className="text-[12px] text-slate-400">{a.country}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <RecentList />
      </section>

      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[24px] bg-ink p-6 text-white sm:p-10">
          <div className="route-pattern absolute inset-0" aria-hidden />
          <div className="relative grid gap-8 md:grid-cols-3">
            {ANNOUNCEMENTS.map((a, i) => (
              <div key={a.title}>
                <span className="font-mono text-[13px] text-mint">0{i + 1}</span>
                <h3 className="mt-2 text-[17px] font-semibold">{a.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-slate-300">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.8fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Questions, answered</h2>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-slate-500">Short answers to what people ask most. For refunds or rules, your carrier has the final word.</p>
          </div>
          <Faq />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: SITE.name, url: SITE.url }) }}
      />
    </>
  );
}
