import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/page-header";
import { findAirport } from "@/lib/data/airports";
import { normalizeAirportCode } from "@/lib/validation";
import { ErrorState } from "@/components/result-states";
import { AirportDetail } from "@/features/flights/airport-detail";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const a = findAirport(code);
  const label = a ? `${a.name} (${a.iata})` : code.toUpperCase();
  return {
    title: `${label}: Arrivals, Departures & Airport Info`,
    description: `Live arrivals and departures, terminals and location for ${label}.`,
    alternates: { canonical: `/airports/${(a?.iata ?? code).toUpperCase()}` },
  };
}

export default async function Page({ params }: Props) {
  const { code: raw } = await params;
  const code = normalizeAirportCode(decodeURIComponent(raw));
  const a = code ? findAirport(code) : undefined;

  if (!code) {
    return (
      <>
        <PageHeader eyebrow="Airports" title="Invalid airport code" />
        <Section className="relative -mt-20">
          <ErrorState code="INVALID_AIRPORT" message={`"${raw}" is not a valid IATA (3-letter) or ICAO (4-letter) airport code.`} />
          <p className="mt-4 text-sm"><Link href="/airports" className="font-medium text-brand-700 hover:underline">← Search airports</Link></p>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Airport" title={a?.name ?? `Airport ${code}`} description={a ? `${a.city}, ${a.country}` : "Reference details for this airport are not in our directory, but live flight boards may still be available."}>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {a && <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[13px] text-slate-200">IATA {a.iata}</span>}
          {a && <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[13px] text-slate-200">ICAO {a.icao}</span>}
          {!a && <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[13px] text-slate-200">{code}</span>}
        </div>
      </PageHeader>
      <AirportDetail code={code} airport={a ?? null} />
    </>
  );
}
