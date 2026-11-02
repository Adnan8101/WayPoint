import "server-only";
import type { AirQuality, Place, WeatherReport } from "@/lib/types";
import { ApiError } from "../errors";
import { fetchJson } from "../http";
import { arr, get, num, obj, str } from "../pick";

// Google Maps Platform web services that take an API key: Geocoding, Time Zone,
// Weather and Air Quality. Places and Routes use the service account (places.ts).

export const weatherSource = "Google Weather";
export const airSource = "Google Air Quality";

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new ApiError("NOT_CONFIGURED", "Google Maps services are not configured.");
  return k;
}

/** Google errors arrive as 200s with a status field (legacy APIs) or as HTTP errors (new APIs) */
function checkStatus(raw: unknown, what: string) {
  const status = str(raw, "status");
  if (!status || status === "OK") return;
  if (status === "ZERO_RESULTS") throw new ApiError("NO_RESULTS", `${what}: nothing found.`);
  console.warn(`[google] ${what} → ${status}: ${str(raw, "error_message") ?? ""}`);
  throw new ApiError("UNAVAILABLE", `${what} is unavailable right now.`);
}

// ---------- Time zone ----------

/** IANA zone at a point (Google returns some legacy names, e.g. Asia/Calcutta; Intl accepts them) */
export async function timeZoneAt(lat: number, lng: number): Promise<string> {
  const raw = await fetchJson(`https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${key()}`);
  checkStatus(raw, "Time zone lookup");
  const id = str(raw, "timeZoneId");
  if (!id) throw new ApiError("NO_RESULTS", "No time zone for that location.");
  return id;
}

// ---------- Geocoding ----------

function placeFromGeocode(r: unknown): Place {
  const parts = arr(get(r, "address_components"));
  const find = (type: string, short = false) => {
    const c = parts.find((p) => arr(get(p, "types")).includes(type));
    return str(c, short ? "short_name" : "long_name");
  };
  const name = find("sublocality_level_1") ?? find("sublocality") ?? find("locality") ?? find("administrative_area_level_2") ?? str(r, "formatted_address")?.split(",")[0] ?? "";
  return {
    name,
    district: find("locality") !== name ? find("locality") : find("administrative_area_level_2"),
    region: find("administrative_area_level_1"),
    country: find("country"),
    countryCode: find("country", true),
    lat: num(r, "geometry.location.lat") ?? 0,
    lon: num(r, "geometry.location.lng") ?? 0,
  };
}

export async function geocodeAddress(address: string): Promise<Place | undefined> {
  const raw = await fetchJson(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key()}`);
  if (str(raw, "status") === "ZERO_RESULTS") return undefined;
  checkStatus(raw, "Geocoding");
  const first = arr(get(raw, "results"))[0];
  return first ? placeFromGeocode(first) : undefined;
}

export async function geocodePlaceId(placeId: string): Promise<Place | undefined> {
  const raw = await fetchJson(`https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${key()}`);
  if (str(raw, "status") === "ZERO_RESULTS") return undefined;
  checkStatus(raw, "Geocoding");
  const first = arr(get(raw, "results"))[0];
  return first ? placeFromGeocode(first) : undefined;
}

/** Place plus its time zone */
export async function withTimeZone(p: Place): Promise<Place> {
  if (p.timeZone) return p;
  return { ...p, timeZone: await timeZoneAt(p.lat, p.lon).catch(() => undefined) };
}

// ---------- Weather ----------

/** Google condition type → WMO code, which the UI already labels and draws */
function wmo(type: string | undefined): number {
  const t = (type ?? "").toUpperCase();
  if (!t) return -1;
  if (/THUNDER/.test(t)) return /HEAVY/.test(t) ? 99 : 95;
  if (/HAIL/.test(t)) return 96;
  if (/SNOW/.test(t)) return /HEAVY|STORM/.test(t) ? 75 : /SHOWER/.test(t) ? 85 : /LIGHT/.test(t) ? 71 : 73;
  if (/RAIN_AND_SNOW/.test(t)) return 67;
  if (/SHOWER/.test(t)) return /HEAVY/.test(t) ? 82 : /LIGHT|CHANCE|SCATTERED/.test(t) ? 80 : 81;
  if (/RAIN/.test(t)) return /HEAVY/.test(t) ? 65 : /LIGHT/.test(t) ? 61 : 63;
  if (/DRIZZLE/.test(t)) return 53;
  if (/FOG|HAZE|MIST|SMOKE|DUST/.test(t)) return 45;
  if (t === "CLEAR") return 0;
  if (t === "MOSTLY_CLEAR") return 1;
  if (t === "PARTLY_CLOUDY" || t === "WINDY") return 2;
  if (/CLOUDY/.test(t)) return 3;
  return -1;
}

/** ISO instant → local "YYYY-MM-DDTHH:mm" in a zone */
function localIso(instant: string | undefined, zone: string): string {
  if (!instant) return "";
  const d = new Date(instant);
  if (Number.isNaN(d.getTime())) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function offsetSeconds(zone: string): number {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName")?.value ?? "GMT";
    const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3] ?? 0) * 60) : 0;
  } catch {
    return 0;
  }
}

export async function getWeather(place: Place): Promise<WeatherReport> {
  const at = `key=${key()}&location.latitude=${place.lat}&location.longitude=${place.lon}`;
  const [now, hours, days] = await Promise.all([
    fetchJson(`https://weather.googleapis.com/v1/currentConditions:lookup?${at}`),
    fetchJson(`https://weather.googleapis.com/v1/forecast/hours:lookup?${at}&hours=24&pageSize=24`).catch(() => undefined),
    fetchJson(`https://weather.googleapis.com/v1/forecast/days:lookup?${at}&days=10&pageSize=10`).catch(() => undefined),
  ]);
  const temp = num(now, "temperature.degrees");
  if (temp === undefined) throw new ApiError("UNAVAILABLE", "Weather information is currently unavailable for this location.");
  const zone = str(now, "timeZone.id") ?? place.timeZone ?? "UTC";
  const day0 = arr(get(days, "forecastDays"))[0];

  return {
    location: { ...place, timeZone: place.timeZone ?? zone },
    current: {
      time: localIso(str(now, "currentTime"), zone),
      temperatureC: temp,
      apparentC: num(now, "feelsLikeTemperature.degrees"),
      humidity: num(now, "relativeHumidity") ?? NaN,
      windKmh: num(now, "wind.speed.value") ?? NaN,
      windDirDeg: num(now, "wind.direction.degrees"),
      code: wmo(str(now, "weatherCondition.type")),
      isDay: get(now, "isDaytime") !== false,
      description: str(now, "weatherCondition.description.text"),
      sunrise: localIso(str(day0, "sunEvents.sunriseTime"), zone).slice(11) || undefined,
      sunset: localIso(str(day0, "sunEvents.sunsetTime"), zone).slice(11) || undefined,
      visibilityKm: num(now, "visibility.distance"),
      pressureHpa: num(now, "airPressure.meanSeaLevelMillibars") !== undefined ? Math.round(num(now, "airPressure.meanSeaLevelMillibars")!) : undefined,
      gustKmh: num(now, "wind.gust.value"),
      cloudPct: num(now, "cloudCover"),
      uvIndex: num(now, "uvIndex"),
      precipProb: num(now, "precipitation.probability.percent"),
    },
    hourly: arr(get(hours, "forecastHours")).map((h) => ({
      time: localIso(str(h, "interval.startTime"), zone),
      tempC: num(h, "temperature.degrees") ?? NaN,
      code: wmo(str(h, "weatherCondition.type")),
      isDay: get(h, "isDaytime") !== false,
      precipProb: num(h, "precipitation.probability.percent"),
    })).filter((h) => h.time),
    daily: arr(get(days, "forecastDays")).map((d) => ({
      date: `${num(d, "displayDate.year")}-${String(num(d, "displayDate.month")).padStart(2, "0")}-${String(num(d, "displayDate.day")).padStart(2, "0")}`,
      maxC: num(d, "maxTemperature.degrees") ?? NaN,
      minC: num(d, "minTemperature.degrees") ?? NaN,
      code: wmo(str(d, "daytimeForecast.weatherCondition.type")),
      precipProb: Math.max(num(d, "daytimeForecast.precipitation.probability.percent") ?? 0, num(d, "nighttimeForecast.precipitation.probability.percent") ?? 0),
    })).filter((d) => Number.isFinite(d.maxC)),
    utcOffsetSeconds: offsetSeconds(zone),
  };
}

// ---------- Air quality ----------

const rgb = (c: unknown) => {
  const o = obj(c) ?? {};
  const v = (k: string) => Math.round((num(o, k) ?? 0) * 255);
  return `rgb(${v("red")} ${v("green")} ${v("blue")})`;
};

export async function getAirQuality(lat: number, lng: number): Promise<AirQuality> {
  const raw = await fetchJson(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${key()}`, {
    body: { location: { latitude: lat, longitude: lng }, extraComputations: ["LOCAL_AQI", "HEALTH_RECOMMENDATIONS", "POLLUTANT_CONCENTRATION"], languageCode: "en" },
  });
  const indexes = arr(get(raw, "indexes"));
  // Prefer the country's own index (the universal one comes first)
  const idx = indexes.find((i) => str(i, "code") !== "uaqi") ?? indexes[0];
  const aqi = num(idx, "aqi");
  if (aqi === undefined) throw new ApiError("NO_RESULTS", "Air quality isn't available for this location.");
  return {
    aqi,
    indexName: str(idx, "displayName") ?? "AQI",
    category: str(idx, "category") ?? "",
    color: rgb(get(idx, "color")),
    dominant: str(idx, "dominantPollutant"),
    pollutants: arr(get(raw, "pollutants")).map((p) => ({
      code: str(p, "code") ?? "",
      name: str(p, "displayName") ?? "",
      value: num(p, "concentration.value") ?? 0,
      units: (str(p, "concentration.units") ?? "").replace("PARTS_PER_BILLION", "ppb").replace("MICROGRAMS_PER_CUBIC_METER", "µg/m³"),
    })),
    advice: str(raw, "healthRecommendations.generalPopulation"),
    at: str(raw, "dateTime") ?? new Date().toISOString(),
  };
}
