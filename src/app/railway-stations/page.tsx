import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, RuleHeading, SearchPanel, Section } from "@/components/page-header";
import { StationSearchForm } from "@/components/forms";
import { STATIONS } from "@/lib/data/stations";

export const metadata: Metadata = {
  title: "Railway Station Information: Arrivals & Departures",
  description: "Search Indian Railways stations by name, code or city and view upcoming train arrivals and departures.",
  alternates: { canonical: "/railway-stations" },
};

export default function Page() {
  const byState = new Map<string, typeof STATIONS>();
  for (const s of STATIONS) byState.set(s.state, [...(byState.get(s.state) ?? []), s]);
  const states = [...byState.keys()].sort();
  return (
    <>
      <PageHeader eyebrow="Indian Railways" title="Railway Station Information" description="Station codes and locations, plus upcoming arrivals and departures." />
      <SearchPanel><StationSearchForm /></SearchPanel>
      <Section>
        <RuleHeading>Major stations</RuleHeading>
        <p className="-mt-2 mb-6 text-[15px] text-slate-600">Any station code works in the search. Here are the busiest stations, grouped by state.</p>
        <div className="columns-1 gap-10 sm:columns-2 lg:columns-3">
          {states.map((st) => (
            <div key={st} className="mb-8 break-inside-avoid">
              <h3 className="label mb-1">{st}</h3>
              <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white [&>li:last-child>a]:border-0">
                {byState.get(st)!.map((s) => (
                  <li key={s.code}>
                    <Link href={`/railway-stations/${s.code}`} className="group flex items-baseline gap-3 border-b border-slate-100 px-4 py-2.5 text-[14.5px] transition-colors hover:bg-slate-50">
                      <span className="w-12 font-mono font-semibold text-brand-700">{s.code}</span>
                      <span className="min-w-0 flex-1 truncate text-ink group-hover:text-brand-700">{s.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
