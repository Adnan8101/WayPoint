import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/page-header";
import { airportWithZone } from "@/lib/server/providers/ourairports";
import { normalizeAirportCode } from "@/lib/validation";
import { ErrorState } from "@/components/result-states";
import { AirportDetail } from "@/features/flights/airport-detail";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const norm = normalizeAirportCode(decodeURIComponent(code));
  const a = norm ? await airportWithZone(norm).catch(() => undefined) : undefined;
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
  const a = code ? await airportWithZone(code).catch(() => undefined) : undefined;

  if (!code) {
    return (
      <>
        <PageHeader eyebrow="Airports" title="Invalid airport code" />
        <Section className="relative -mt-20">
          <ErrorState code="INVALID_AIRPORT" message={`"${raw}" is not a valid IATA (3-letter) or ICAO (4-letter) airport code.`} />
          <p className="mt-4 text-sm"><Link href="/airports" className="font-medium text-ink underline decoration-signal decoration-2 underline-offset-4 transition-colors hover:decoration-ink">← Search airports</Link></p>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Airport" title={a?.name ?? `Airport ${code}`} description={a ? [a.city, a.country].filter(Boolean).join(", ") : "We couldn't load reference details for this code, but live flight boards may still be available."}>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {a && <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[13px] text-slate-200">IATA {a.iata}</span>}
          {a?.icao && <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[13px] text-slate-200">ICAO {a.icao}</span>}
          {!a && <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[13px] text-slate-200">{code}</span>}
        </div>
      </PageHeader>
      <AirportDetail code={code} airport={a ?? null} />
    </>
  );
}
