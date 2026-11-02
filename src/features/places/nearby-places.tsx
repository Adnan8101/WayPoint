"use client";

import { useMemo, useState } from "react";
import { NEARBY_CATEGORIES, type NearbyCategory, type PlaceSummary } from "@/lib/places-types";
import { useApi } from "@/lib/client/use-api";
import { cx } from "@/lib/format";
import { ApiResult } from "@/components/api-result";
import { EmptyState, Skeleton } from "@/components/result-states";
import { Card, Tabs } from "@/components/ui";
import { ArrowRightIcon } from "@/components/icons";

const ORDER: NearbyCategory[] = ["restaurants", "hotels", "transport", "essentials", "attractions"];

/** Straight-line distance in km */
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12_742 * Math.asin(Math.sqrt(h));
}

/** Food, hotels, transport, essentials and sights around a point, from Google Places */
export function NearbyPlaces({ lat, lon, title = "Around here" }: { lat: number; lon: number; title?: string }) {
  const [cat, setCat] = useState<NearbyCategory>("restaurants");
  const req = useMemo(() => ({ url: `/api/places/nearby?${new URLSearchParams({ at: `${lat.toFixed(5)},${lon.toFixed(5)}`, category: cat, radius: cat === "attractions" ? "8000" : "2500" })}` }), [lat, lon, cat]);
  const { state, refresh } = useApi<PlaceSummary[]>(req);
  const here = { lat, lng: lon };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Nearby</p>
          <h2 className="font-display mt-2 text-[28px] font-bold text-ink">{title}</h2>
        </div>
        <div className="no-scrollbar -mx-1 max-w-full overflow-x-auto px-1">
          <Tabs label="Nearby category" value={cat} onChange={setCat} tabs={ORDER.map((c) => ({ value: c, label: NEARBY_CATEGORIES[c].label }))} />
        </div>
      </div>
      <ApiResult
        state={state}
        onRetry={refresh}
        skeleton={<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-56 rounded-[20px]" />)}</div>}
      >
        {(places) =>
          places.length === 0 ? (
            <EmptyState title="Nothing listed nearby">Google doesn&apos;t list any {NEARBY_CATEGORIES[cat].label.toLowerCase()} close to this spot.</EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {places.slice(0, 8).map((p, i) => (
                <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <a
                    href={p.mapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-slate-200/80 bg-white shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      {p.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/places/photo?name=${encodeURIComponent(p.photo.name)}&w=400`}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="dot-field size-full" />
                      )}
                      {p.location && (
                        <span className="absolute left-2.5 top-2.5 rounded-full bg-ink/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-white backdrop-blur">
                          {km(here, p.location) < 1 ? `${Math.round(km(here, p.location) * 1000)} m` : `${km(here, p.location).toFixed(1)} km`}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="line-clamp-2 font-semibold leading-snug text-ink">{p.name}</p>
                      <p className="mt-1 text-[12.5px] text-slate-500">{p.typeLabel ?? ""}</p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        {p.rating ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[12.5px] font-semibold text-ink">
                            <span className="text-amber-500" aria-hidden>★</span> {p.rating.toFixed(1)}
                            {p.ratingCount ? <span className="font-normal text-slate-400">({p.ratingCount.toLocaleString("en-IN")})</span> : null}
                          </span>
                        ) : <span />}
                        <ArrowRightIcon width={15} height={15} className={cx("-rotate-45 text-slate-300 transition-colors group-hover:text-ink")} />
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )
        }
      </ApiResult>
      <p className="mt-3 text-[12px] text-slate-400">Places, photos and ratings from Google Maps. Opens in Google Maps.</p>
    </div>
  );
}

export function NearbyCard(props: { lat: number; lon: number; title?: string }) {
  return (
    <Card className="p-5 sm:p-6">
      <NearbyPlaces {...props} />
    </Card>
  );
}
