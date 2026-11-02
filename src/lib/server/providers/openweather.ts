import "server-only";
import type { Place, WeatherReport } from "@/lib/types";
import { ApiError } from "../errors";
import { fetchJson } from "../http";
import { arr, get, num, obj, str } from "../pick";

// OpenWeatherMap (https://openweathermap.org/api): free-tier geocoding,
// current weather and the 5-day / 3-hour forecast. One Call 3.0 needs a
// separate subscription, so daily figures are aggregated from the 3-hour steps.

export const weatherSource = "OpenWeatherMap";

const BASE = "https://api.openweathermap.org";

function key() {
  const k = process.env.OPENWEATHER_API_KEY;
  if (!k) throw new ApiError("NOT_CONFIGURED", "Weather information is not available right now (weather provider not configured).");
  return k;
}

const regionName = (() => {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return (code?: string) => (code ? (names.of(code) ?? code) : undefined);
  } catch {
    return (code?: string) => code;
  }
})();

export async function geocode(query: string): Promise<Place[]> {
  const qs = new URLSearchParams({ q: query, limit: "5", appid: key() });
  const raw = await fetchJson(`${BASE}/geo/1.0/direct?${qs}`);
  return arr(raw).map((r) => ({
    name: str(r, "local_names.en", "name") ?? query,
    region: str(r, "state"),
    country: regionName(str(r, "country")),
    countryCode: str(r, "country"),
    lat: num(r, "lat") ?? 0,
    lon: num(r, "lon") ?? 0,
  }));
}

/**
 * OpenWeatherMap condition id → WMO weather code, which the UI already labels.
 * https://openweathermap.org/weather-conditions
 */
function toWmo(id: number | undefined): number {
  if (id === undefined) return -1;
  if (id >= 200 && id < 300) return id === 202 || id === 212 || id === 221 ? 99 : 95;
  if (id >= 300 && id < 400) return [300, 310].includes(id) ? 51 : [302, 312, 314].includes(id) ? 55 : 53;
  if (id === 500) return 61;
  if (id === 501) return 63;
  if (id >= 502 && id <= 504) return 65;
  if (id === 511) return 66;
  if (id === 520) return 80;
  if (id === 521) return 81;
  if (id === 522 || id === 531) return 82;
  if (id === 600) return 71;
  if (id === 601) return 73;
  if (id === 602) return 75;
  if (id >= 611 && id <= 616) return 77;
  if (id === 620) return 85;
  if (id === 621 || id === 622) return 86;
  if (id >= 700 && id < 800) return 45;
  if (id === 800) return 0;
  if (id === 801) return 1;
  if (id === 802) return 2;
  if (id === 803 || id === 804) return 3;
  return -1;
}

const conditionId = (r: unknown) => num(arr(get(r, "weather"))[0], "id");

/** Unix seconds + UTC offset → local "YYYY-MM-DDTHH:MM" */
const localIso = (unix: number, offset: number) => new Date((unix + offset) * 1000).toISOString().slice(0, 16);

export async function getWeather(place: Place): Promise<WeatherReport> {
  const qs = new URLSearchParams({ lat: String(place.lat), lon: String(place.lon), units: "metric", appid: key() });
  const [now, forecast] = await Promise.all([
    fetchJson(`${BASE}/data/2.5/weather?${qs}`),
    fetchJson(`${BASE}/data/2.5/forecast?${qs}`),
  ]);
  const main = obj(get(now, "main"));
  const dt = num(now, "dt");
  if (!main || dt === undefined) throw new ApiError("UNAVAILABLE", "Weather information is currently unavailable for this location.");

  const offset = num(now, "timezone") ?? num(get(forecast, "city"), "timezone") ?? 0;
  const sunrise = num(get(now, "sys"), "sunrise");
  const sunset = num(get(now, "sys"), "sunset");
  const temp = num(main, "temp") ?? NaN;

  // Fold 3-hour steps into local calendar days; the step nearest local noon sets the day's condition
  const days = new Map<string, { maxC: number; minC: number; code: number; noonGap: number; pop?: number }>();
  for (const step of arr(get(forecast, "list"))) {
    const t = num(step, "dt");
    if (t === undefined) continue;
    const local = localIso(t, offset);
    const date = local.slice(0, 10);
    const hour = Number(local.slice(11, 13));
    const m = obj(get(step, "main"));
    const hi = num(m, "temp_max") ?? num(m, "temp");
    const lo = num(m, "temp_min") ?? num(m, "temp");
    const pop = num(step, "pop");
    const gap = Math.abs(hour - 12);
    const d = days.get(date) ?? { maxC: -Infinity, minC: Infinity, code: -1, noonGap: Infinity };
    if (hi !== undefined) d.maxC = Math.max(d.maxC, hi);
    if (lo !== undefined) d.minC = Math.min(d.minC, lo);
    if (pop !== undefined) d.pop = Math.max(d.pop ?? 0, Math.round(pop * 100));
    if (gap < d.noonGap) {
      d.noonGap = gap;
      d.code = toWmo(conditionId(step));
    }
    days.set(date, d);
  }

  // Today's remaining steps may miss the current reading, so fold it in
  const today = localIso(dt, offset).slice(0, 10);
  const t0 = days.get(today);
  if (t0 && Number.isFinite(temp)) {
    t0.maxC = Math.max(t0.maxC, temp);
    t0.minC = Math.min(t0.minC, temp);
  }

  const wind = num(get(now, "wind"), "speed");
  const gust = num(get(now, "wind"), "gust");
  const visibility = num(now, "visibility");
  const hourly = arr(get(forecast, "list"))
    .filter((s) => (num(s, "dt") ?? 0) > dt)
    .slice(0, 8)
    .map((s) => ({
      time: localIso(num(s, "dt")!, offset),
      tempC: num(s, "main.temp") ?? NaN,
      code: toWmo(conditionId(s)),
      isDay: str(s, "sys.pod") !== "n",
      precipProb: num(s, "pop") !== undefined ? Math.round(num(s, "pop")! * 100) : undefined,
    }));
  return {
    // The geocoded name, not the station name the weather endpoint returns (often a suburb)
    location: place,
    current: {
      time: localIso(dt, offset),
      temperatureC: temp,
      apparentC: num(main, "feels_like"),
      humidity: num(main, "humidity") ?? NaN,
      windKmh: wind !== undefined ? wind * 3.6 : NaN,
      windDirDeg: num(get(now, "wind"), "deg"),
      code: toWmo(conditionId(now)),
      isDay: sunrise !== undefined && sunset !== undefined ? dt >= sunrise && dt < sunset : true,
      description: str(arr(get(now, "weather"))[0], "description"),
      sunrise: sunrise !== undefined ? localIso(sunrise, offset).slice(11, 16) : undefined,
      sunset: sunset !== undefined ? localIso(sunset, offset).slice(11, 16) : undefined,
      visibilityKm: visibility !== undefined ? visibility / 1000 : undefined,
      pressureHpa: num(main, "pressure"),
      gustKmh: gust !== undefined ? gust * 3.6 : undefined,
      cloudPct: num(now, "clouds.all"),
    },
    hourly,
    daily: [...days.entries()]
      .filter(([, d]) => Number.isFinite(d.maxC) && Number.isFinite(d.minC))
      .map(([date, d]) => ({ date, maxC: d.maxC, minC: d.minC, code: d.code, precipProb: d.pop })),
    utcOffsetSeconds: offset,
  };
}
