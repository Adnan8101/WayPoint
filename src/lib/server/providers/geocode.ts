import "server-only";
import type { Place } from "@/lib/types";
import { fetchJson } from "../http";
import { arr, num, str } from "../pick";
import { geocode as owmGeocode } from "./openweather";

// Place search for weather. Open-Meteo's geocoder (GeoNames, keyless) covers
// localities OpenWeatherMap's misses and returns an IANA time zone.
// OpenWeatherMap is the fallback. Ranking uses only what the provider returns
// plus the searcher's own time zone; there are no built-in place lists.

type Hit = Place & { population?: number; feature?: string };

async function openMeteo(name: string): Promise<Hit[]> {
  const raw = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=10&language=en&format=json`);
  return arr((raw as { results?: unknown }).results).map((r) => ({
    name: str(r, "name") ?? name,
    district: str(r, "admin2"),
    region: str(r, "admin1"),
    country: str(r, "country"),
    countryCode: str(r, "country_code"),
    lat: num(r, "latitude") ?? 0,
    lon: num(r, "longitude") ?? 0,
    timeZone: str(r, "timezone"),
    population: num(r, "population"),
    feature: str(r, "feature_code"),
  }));
}

/** Ways to read the query, most specific first: "a b c" → name "a b c", then "a b" with context "c", … */
function readings(query: string): { name: string; context: string[] }[] {
  const [head, ...rest] = query.split(",").map((s) => s.trim()).filter(Boolean);
  if (!head) return [];
  const commaContext = rest.join(" ").toLowerCase().split(/\s+/).filter(Boolean);
  const words = head.split(/\s+/);
  const out: { name: string; context: string[] }[] = [];
  for (let n = words.length; n >= 1; n--) {
    out.push({ name: words.slice(0, n).join(" "), context: [...words.slice(n).map((w) => w.toLowerCase()), ...commaContext] });
  }
  return out;
}

function score(p: Hit, wanted: string, context: string[], userTz?: string): number {
  let s = Math.log10((p.population ?? 0) + 10) * 10;
  const n = p.name.toLowerCase();
  const w = wanted.toLowerCase();
  if (n === w) s += 15;
  else if (n.startsWith(w)) s += 5;
  // Capitals and administrative seats are what people usually mean
  if (p.feature === "PPLC" || p.feature === "PPLA") s += 5;
  // Places sharing the searcher's time zone are the likelier match
  if (userTz && p.timeZone === userTz) s += 30;
  // Extra words ("mumbai" in "bandra mumbai") should appear in the place's areas
  const areas = [p.district, p.region, p.country, p.countryCode].filter(Boolean).join(" ").toLowerCase();
  for (const c of context) if (c.length >= 2 && areas.includes(c)) s += 40;
  return s;
}

export async function findPlaces(query: string, limit = 6, userTz?: string): Promise<Place[]> {
  for (const r of readings(query)) {
    const found = await openMeteo(r.name).catch(() => []);
    if (!found.length) continue;
    const seen = new Set<string>();
    return found
      .map((p) => ({ ...p, score: score(p, r.name, r.context, userTz) }))
      .sort((a, b) => b.score - a.score)
      .filter((p) => {
        const key = `${p.name}|${p.region}|${p.lat.toFixed(1)}|${p.lon.toFixed(1)}`;
        return seen.has(key) ? false : (seen.add(key), true);
      })
      .slice(0, limit)
      .map(({ score: _s, population: _p, feature: _f, ...place }): Place => place);
  }
  // Last resort: OpenWeatherMap's own geocoder on the first part
  return (await owmGeocode(query.split(",")[0].trim()).catch(() => [])).slice(0, limit);
}
