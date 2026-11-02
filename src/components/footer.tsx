import Link from "next/link";
import { SITE } from "@/lib/site";
import { Logo } from "./header";
import { ArrowRightIcon, PlaneIcon, TicketIcon, TrainIcon } from "./icons";

const COLUMNS = [
  {
    title: "Travel",
    links: [
      { label: "Flight Status", href: "/flight-status" },
      { label: "Flight Tracker", href: "/flight-tracker" },
      { label: "Train Status", href: "/train-status" },
      { label: "PNR Status", href: "/pnr-status" },
      { label: "Seats & Fare", href: "/seat-availability" },
      { label: "Vacant Berths", href: "/chart-vacancy" },
      { label: "Cancelled Trains", href: "/cancelled-trains" },
      { label: "Train Search", href: "/trains-between-stations" },
      { label: "Train Schedule", href: "/train-schedule" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Airports", href: "/airports" },
      { label: "Railway Stations", href: "/railway-stations" },
      { label: "Train Route", href: "/train-route" },
      { label: "Flight Search", href: "/flight-search" },
      { label: "Travel Information", href: "/travel-information" },
    ],
  },
];

const QUICK = [
  { label: "PNR status", href: "/pnr-status", icon: TicketIcon },
  { label: "Where's my train", href: "/train-status", icon: TrainIcon },
  { label: "Flight status", href: "/flight-status", icon: PlaneIcon },
];

export function Footer() {
  return (
    <footer className="mt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div data-reveal className="relative z-10 -mb-16 overflow-hidden rounded-[28px] bg-signal p-7 text-ink shadow-[0_30px_60px_-30px_rgb(120_80_0/0.45)] sm:p-10">
          <div className="dot-field absolute inset-0 opacity-60" aria-hidden />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="label !text-ink/60">Before you leave</p>
              <h2 className="font-display mt-3 max-w-xl text-[34px] font-bold sm:text-[46px]">Check once more. Platforms and gates change.</h2>
            </div>
            <ul className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="group flex items-center gap-2 rounded-full bg-ink py-2.5 pl-3.5 pr-4 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                  >
                    <q.icon width={16} height={16} className="text-signal" /> {q.label}
                    <ArrowRightIcon width={14} height={14} className="-ml-0.5 w-0 opacity-0 transition-all group-hover:ml-0 group-hover:w-[14px] group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grain relative overflow-hidden bg-ink pt-16 text-white/70">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-10 pt-16 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/60">
              Flight status, train running status and PNR in one quiet, fast place. No sign-up, no clutter.
            </p>
            <p className="mt-6 max-w-sm border-l-2 border-signal/60 pl-3 text-[12.5px] leading-relaxed text-white/40">
              Independent service. Not affiliated with Indian Railways, IRCTC or any airline. Please confirm critical details with your carrier.
            </p>
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="label !text-white/40">{c.title}</p>
              <ul className="mt-5 space-y-3">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="group inline-flex items-center gap-2 text-[14.5px] text-white/70 transition-colors hover:text-white">
                      <span className="h-px w-0 bg-signal transition-all duration-300 group-hover:w-3" aria-hidden />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap justify-between gap-2 border-t border-white/[0.08] py-6 font-mono text-[11.5px] text-white/35">
            <span>© {new Date().getFullYear()} {SITE.name}</span>
            <span>Data · Aviationstack · irctc.dev · OpenWeatherMap · Maps © OpenStreetMap</span>
          </div>
        </div>
        <p
          aria-hidden
          className="font-display pointer-events-none relative -mb-[0.22em] select-none text-center text-[19vw] font-extrabold leading-none tracking-[-0.06em] text-white/[0.035]"
        >
          {SITE.name}
        </p>
      </div>
    </footer>
  );
}
