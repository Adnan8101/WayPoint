import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { AIRPORTS } from "@/lib/data/airports";
import { STATIONS } from "@/lib/data/stations";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "", "/flight-status", "/flight-tracker", "/flight-search", "/airports", "/train-status", "/pnr-status",
    "/trains-between-stations", "/train-schedule", "/train-route", "/railway-stations", "/travel-information",
  ];
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...AIRPORTS.map((a) => ({ url: `${SITE.url}/airports/${a.iata}`, changeFrequency: "daily" as const, priority: 0.5 })),
    ...STATIONS.map((s) => ({ url: `${SITE.url}/railway-stations/${s.code}`, changeFrequency: "daily" as const, priority: 0.5 })),
  ];
}
