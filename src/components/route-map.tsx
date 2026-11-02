"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
  kind: "origin" | "destination" | "stop" | "current" | "aircraft";
}

const COLORS: Record<MapPoint["kind"], string> = {
  origin: "#191712",
  destination: "#191712",
  stop: "#776f61",
  current: "#cf5a24",
  aircraft: "#c0461a",
};

/** Points along the great circle between two coordinates (for flight routes). */
export function greatCircle(a: [number, number], b: [number, number], n = 64): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const [lat1, lon1, lat2, lon2] = [toRad(a[0]), toRad(a[1]), toRad(b[0]), toRad(b[1])];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));
  if (d === 0) return [a, b];
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }
  return pts;
}

export default function RouteMap({
  points, path, passedPath, heightClass = "h-80", headingDeg,
}: { points: MapPoint[]; path: [number, number][]; passedPath?: [number, number][]; heightClass?: string; headingDeg?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      map = L.map(ref.current, { scrollWheelZoom: false, worldCopyJump: true, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      if (path.length > 1) L.polyline(path, { color: "#191712", weight: 2, opacity: 0.45, dashArray: passedPath ? "6 6" : undefined }).addTo(map);
      if (passedPath && passedPath.length > 1) L.polyline(passedPath, { color: "#c0461a", weight: 3 }).addTo(map);

      for (const p of points) {
        if (p.kind === "aircraft") {
          const icon = L.divIcon({
            className: "",
            html: `<div style="transform:rotate(${(headingDeg ?? 0) - 45}deg);font-size:22px;line-height:22px;color:${COLORS.aircraft};text-shadow:0 0 3px #fff">✈</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          L.marker([p.lat, p.lon], { icon, title: p.label }).addTo(map).bindTooltip(p.label);
        } else {
          L.circleMarker([p.lat, p.lon], {
            radius: p.kind === "stop" ? 4 : 7,
            color: "#fff",
            weight: 2,
            fillColor: COLORS[p.kind],
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip(p.label, { permanent: p.kind === "origin" || p.kind === "destination" || p.kind === "current", direction: "top" });
        }
      }
      const all = [...path, ...points.map((p) => [p.lat, p.lon] as [number, number])];
      if (all.length) map.fitBounds(L.latLngBounds(all), { padding: [30, 30] });
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, path, passedPath, headingDeg]);

  return <div ref={ref} className={`${heightClass} w-full overflow-hidden border border-slate-300 bg-slate-100 grayscale-[35%]`} role="img" aria-label="Route map" />;
}
