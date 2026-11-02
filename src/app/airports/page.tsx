import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, RuleHeading, SearchPanel, Section } from "@/components/page-header";
import { AirportSearchForm } from "@/components/forms";
import { AIRPORTS } from "@/lib/data/airports";

export const metadata: Metadata = {
  title: "Airport Information: Arrivals & Departures",
  description: "Search airports by name, IATA/ICAO code, city or country, and view live arrivals and departures boards.",
  alternates: { canonical: "/airports" },
};

export default function Page() {
  const byCountry = new Map<string, typeof AIRPORTS>();
  for (const a of AIRPORTS) byCountry.set(a.country, [...(byCountry.get(a.country) ?? []), a]);
  const countries = [...byCountry.keys()].sort((a, b) => (a === "India" ? -1 : b === "India" ? 1 : a.localeCompare(b)));

  return (
    <>
      <PageHeader eyebrow="Flights" title="Airport Information" description="Airport codes, locations, terminals and live arrivals and departures." />
      <SearchPanel><AirportSearchForm /></SearchPanel>
      <Section>
        <RuleHeading>Browse airports</RuleHeading>
        <p className="-mt-2 mb-6 text-[15px] text-slate-600">Any airport with an IATA or ICAO code works in the search. These are the ones people look up most.</p>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((c) => (
            <div key={c}>
              <h3 className="label mb-1">{c}</h3>
              <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white [&>li:last-child>a]:border-0">
                {byCountry.get(c)!.map((a) => (
                  <li key={a.iata}>
                    <Link href={`/airports/${a.iata}`} className="group flex items-baseline gap-3 border-b border-slate-100 px-4 py-2.5 text-[14.5px] transition-colors hover:bg-slate-50">
                      <span className="w-10 font-mono font-semibold text-brand-700">{a.iata}</span>
                      <span className="min-w-0 flex-1 truncate text-ink group-hover:text-brand-700">{a.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{a.city}</span>
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
