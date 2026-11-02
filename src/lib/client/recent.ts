"use client";

import { useEffect, useState } from "react";

// Recent searches are kept only in this browser's localStorage. Only the search
// query (e.g. a flight or PNR number) is stored, never the results.

export type RecentKind = "flight" | "tracker" | "flight-search" | "airport" | "pnr" | "train" | "between" | "schedule" | "route" | "station" | "seats" | "vacancy";

export interface RecentItem {
  kind: RecentKind;
  label: string;
  href: string;
  at: number;
}

const KEY = "waypoint:recent:v1";
/** Key used before the WayPoint rename; read once so saved searches carry over */
const OLD_KEY = "travelhub:recent:v1";
const MAX = 12;
const EVENT = "waypoint:recent";

function read(): RecentItem[] {
  try {
    const old = localStorage.getItem(OLD_KEY);
    if (old !== null) {
      if (localStorage.getItem(KEY) === null) localStorage.setItem(KEY, old);
      localStorage.removeItem(OLD_KEY);
    }
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.href === "string" && x.href.startsWith("/")) : [];
  } catch {
    return [];
  }
}

export function addRecent(item: Omit<RecentItem, "at">) {
  try {
    const list = read().filter((x) => x.href !== item.href);
    list.unshift({ ...item, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable: ignore */
  }
}

export function clearRecent() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function useRecent(kinds?: RecentKind[]): RecentItem[] {
  const [items, setItems] = useState<RecentItem[]>([]);
  const filter = kinds?.join(",");
  useEffect(() => {
    const load = () => setItems(read().filter((x) => !filter || filter.split(",").includes(x.kind)));
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [filter]);
  return items;
}
