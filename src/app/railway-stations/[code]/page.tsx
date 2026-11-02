import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/page-header";
import { ErrorState } from "@/components/result-states";
import { findStation } from "@/lib/data/stations";
import { normalizeStationCode } from "@/lib/validation";
import { StationDetail } from "@/features/trains/station-detail";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const s = findStation(code);
  const label = s ? `${s.name} (${s.code})` : code.toUpperCase();
  return {
    title: `${label} Railway Station: Arrivals & Departures`,
    description: `Upcoming train arrivals and departures, platform and location information for ${label}.`,
    alternates: { canonical: `/railway-stations/${code.toUpperCase()}` },
  };
}

export default async function Page({ params }: Props) {
  const { code: raw } = await params;
  const code = normalizeStationCode(decodeURIComponent(raw));
  if (!code) {
    return (
      <>
        <PageHeader eyebrow="Railway stations" title="Invalid station code" />
        <Section className="relative -mt-20">
          <ErrorState code="INVALID_STATION" message={`"${raw}" is not a valid station code. Station codes are 1–5 letters, such as NDLS or HWH.`} />
          <p className="mt-4 text-sm"><Link href="/railway-stations" className="font-medium text-brand-700 hover:underline">← Search stations</Link></p>
        </Section>
      </>
    );
  }
  const s = findStation(code);
  return (
    <>
      <PageHeader eyebrow="Railway station" title={s ? s.name : `Station ${code}`} description={s ? `${s.city}, ${s.state}` : "This station is not in our directory, but live train information may still be available."}>
        <div className="mt-4"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[13px] text-slate-200">Code {code}</span></div>
      </PageHeader>
      <StationDetail code={code} station={s ?? null} />
    </>
  );
}
