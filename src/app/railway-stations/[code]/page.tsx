import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Section } from "@/components/page-header";
import { ErrorState } from "@/components/result-states";
import { cached } from "@/lib/server/cache";
import { getStation } from "@/lib/server/providers/irctcdev";
import { findPlaces } from "@/lib/server/providers/geocode";
import { searchText } from "@/lib/server/google/places";
import type { Station } from "@/lib/types";
import { normalizeStationCode } from "@/lib/validation";
import { StationDetail } from "@/features/trains/station-detail";

type Props = { params: Promise<{ code: string }> };

/** Station record from irctc.dev, placed on the map via Google Places (exact) or the geocoder (approximate) */
async function loadStation(code: string): Promise<Station | null> {
  try {
    const { value: s } = await cached(`station:${code}`, 30 * 24 * 60 * 60_000, () => getStation(code));
    const spot = await cached(`stgeo2:${code}`, 30 * 24 * 60 * 60_000, async () => {
      const station = await searchText(`${s.name} railway station ${s.state ?? ""}`.trim(), { includedType: "train_station", limit: 1 }).catch(() => []);
      if (station[0]?.location) return { lat: station[0].location.lat, lon: station[0].location.lng, exact: true };
      const area = (await findPlaces([s.name, s.state].filter(Boolean).join(", "), 1))[0];
      return area ? { lat: area.lat, lon: area.lon, exact: false } : null;
    }).catch(() => null);
    return { ...s, lat: spot?.value?.lat, lon: spot?.value?.lon, exact: spot?.value?.exact };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const norm = normalizeStationCode(decodeURIComponent(code));
  const s = norm ? await loadStation(norm) : null;
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
          <ErrorState code="INVALID_STATION" message={`"${raw}" is not a valid station code. Station codes are 1–5 letters.`} />
          <p className="mt-4 text-sm"><Link href="/railway-stations" className="font-medium text-ink underline decoration-signal decoration-2 underline-offset-4 transition-colors hover:decoration-ink">← Search stations</Link></p>
        </Section>
      </>
    );
  }
  const s = await loadStation(code);
  return (
    <>
      <PageHeader eyebrow="Railway station" title={s ? s.name : `Station ${code}`} description={s ? s.state || "Indian Railways" : "We couldn't load details for this code, but live train information may still be available."}>
        <div className="mt-4"><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[13px] text-slate-200">Code {code}</span></div>
      </PageHeader>
      <StationDetail code={code} station={s ?? null} />
    </>
  );
}
