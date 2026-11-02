import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Tool pages only: airport and station pages exist for every code, so they're reached by search
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "", "/flight-status", "/flight-search", "/airports", "/train-status", "/pnr-status",
    "/trains-between-stations", "/train-schedule", "/railway-stations", "/seats", "/cancelled-trains",
  ];
  return pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 }));
}
