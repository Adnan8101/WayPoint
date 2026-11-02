"use client";

import { useEffect, useState } from "react";
import type { Airport, Station } from "@/lib/types";
import { getJson } from "./use-api";

/** Name and state for a station code, from irctc.dev; undefined until loaded or if unknown */
export function useStation(code: string | undefined): Station | undefined {
  return useLookup<Station>(code ? `/api/stations/${encodeURIComponent(code)}/info` : null);
}

/** Airport record (with time zone) for an IATA/ICAO code, from OurAirports */
export function useAirport(code: string | undefined): Airport | undefined {
  return useLookup<Airport>(code ? `/api/airports/${encodeURIComponent(code)}/info` : null);
}

function useLookup<T>(url: string | null): T | undefined {
  const [value, setValue] = useState<{ url: string; data: T | null }>();
  useEffect(() => {
    if (!url) return;
    let live = true;
    getJson<T>(url).then((data) => live && setValue({ url, data }));
    return () => {
      live = false;
    };
  }, [url]);
  return value && value.url === url && value.data ? value.data : undefined;
}

/** "New Delhi (NDLS)" once the name is known, the bare code before that */
export const stationLabel = (code: string, s?: Station) => (s ? `${s.name} (${code})` : code);
