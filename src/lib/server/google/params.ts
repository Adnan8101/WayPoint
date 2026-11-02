import "server-only";
import type { LatLng } from "@/lib/places-types";

/** "12.97,77.59" → { lat, lng } when valid */
export function parseLatLng(v: string | null): LatLng | undefined {
  const m = v?.match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return undefined;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined;
}

/** Google place IDs are URL-safe base64-ish strings */
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,300}$/;
