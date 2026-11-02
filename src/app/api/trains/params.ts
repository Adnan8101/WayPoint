import { ApiError } from "@/lib/server/errors";
import type { Quota, TravelClass } from "@/lib/types";

export const CLASSES: TravelClass[] = ["1A", "2A", "3A", "3E", "CC", "EC", "SL"];
export const QUOTAS: Quota[] = ["GN", "TQ", "PT", "LD"];

export function parseClass(v: string | null, fallback: TravelClass): TravelClass {
  const c = (v ?? fallback).toUpperCase();
  if (!CLASSES.includes(c as TravelClass)) throw new ApiError("INVALID_INPUT", `Choose a class: ${CLASSES.join(", ")}.`);
  return c as TravelClass;
}

export function parseQuota(v: string | null): Quota {
  const q = (v ?? "GN").toUpperCase();
  if (!QUOTAS.includes(q as Quota)) throw new ApiError("INVALID_INPUT", "Choose a quota: General, Tatkal, Premium Tatkal or Ladies.");
  return q as Quota;
}
