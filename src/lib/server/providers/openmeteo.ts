import "server-only";
import type { Place, WeatherReport } from "@/lib/types";
import { ApiError } from "../errors";
import { fetchJson } from "../http";
import { arr, num, obj, str } from "../pick";

// Open-Meteo (https://open-meteo.com): free, keyless geocoding and forecasts.

export const weatherSource = "Open-Meteo";

export async function geocode(query: string): Promise<Place[]> {
  const raw = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`,
  );
  return arr(obj(raw)?.results).map((r) => ({
    name: str(r, "name") ?? query,
    region: str(r, "admin1"),
    country: str(r, "country"),
    lat: num(r, "latitude") ?? 0,
    lon: num(r, "longitude") ?? 0,
    timeZone: str(r, "timezone") ?? "UTC",
  }));
}

export async function getWeather(place: Place): Promise<WeatherReport> {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: place.timeZone || "auto",
    forecast_days: "7",
  });
  const raw = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  const c = obj(obj(raw)?.current);
  const d = obj(obj(raw)?.daily);
  if (!c || !d) throw new ApiError("UNAVAILABLE", "Weather information is currently unavailable for this location.");
  const dates = arr(d.time) as string[];
  return {
    location: { ...place, timeZone: str(raw, "timezone") ?? place.timeZone },
    current: {
      time: str(c, "time") ?? "",
      temperatureC: num(c, "temperature_2m") ?? NaN,
      apparentC: num(c, "apparent_temperature"),
      humidity: num(c, "relative_humidity_2m") ?? NaN,
      windKmh: num(c, "wind_speed_10m") ?? NaN,
      windDirDeg: num(c, "wind_direction_10m"),
      code: num(c, "weather_code") ?? -1,
      isDay: num(c, "is_day") === 1,
    },
    daily: dates.map((date, i) => ({
      date,
      maxC: (arr(d.temperature_2m_max)[i] as number) ?? NaN,
      minC: (arr(d.temperature_2m_min)[i] as number) ?? NaN,
      code: (arr(d.weather_code)[i] as number) ?? -1,
      precipProb: arr(d.precipitation_probability_max)[i] as number | undefined,
    })),
    utcOffsetSeconds: num(raw, "utc_offset_seconds") ?? 0,
    timeZoneAbbr: str(raw, "timezone_abbreviation"),
  };
}
