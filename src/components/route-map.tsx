"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_STYLES, loadGoogleMaps, type GoogleNS } from "@/lib/client/google-maps";

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
  kind: "origin" | "destination" | "stop" | "current" | "aircraft";
}

const INK = "#0b0d10";
const SIGNAL = "#ffc21a";
const FILL: Record<MapPoint["kind"], string> = {
  origin: INK,
  destination: "#ffffff",
  stop: "#a59c8c",
  current: SIGNAL,
  aircraft: SIGNAL,
};

/** Plane glyph pointing up (north) at rotation 0, centred on 12,12 */
const PLANE_PATH = "M12 2c.8 0 1.4.7 1.4 1.5V9l7.6 4.5v2l-7.6-2.3V18l2.2 1.6V21L12 20l-3.6 1v-1.4L10.6 18v-4.8L3 15.5v-2L10.6 9V3.5C10.6 2.7 11.2 2 12 2z";

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

/** Google map with route lines and labelled markers */
export default function RouteMap({
  points, path, passedPath, heightClass = "h-80", headingDeg,
}: { points: MapPoint[]; path: [number, number][]; passedPath?: [number, number][]; heightClass?: string; headingDeg?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const drawn: GoogleNS[] = [];
    (async () => {
      let g: GoogleNS;
      try {
        g = await loadGoogleMaps();
      } catch {
        if (!cancelled) setFailed(true);
        return;
      }
      const [{ Map, Polyline }, { Marker }, { SymbolPath, LatLngBounds, Point }] = await Promise.all([
        g.maps.importLibrary("maps"),
        g.maps.importLibrary("marker"),
        g.maps.importLibrary("core"),
      ]);
      if (cancelled || !ref.current) return;

      const map = new Map(ref.current, {
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: true,
        gestureHandling: "cooperative",
        clickableIcons: false,
        backgroundColor: "#f2efe8",
      });
      const ll = ([lat, lng]: [number, number]) => ({ lat, lng });

      if (path.length > 1) {
        // Dashed when part of it is already travelled, solid otherwise
        drawn.push(
          new Polyline({
            map,
            path: path.map(ll),
            strokeColor: INK,
            strokeOpacity: passedPath ? 0 : 0.75,
            strokeWeight: 3,
            geodesic: true,
            icons: passedPath ? [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.55, strokeColor: INK, scale: 3 }, offset: "0", repeat: "14px" }] : undefined,
          }),
        );
      }
      if (passedPath && passedPath.length > 1) {
        drawn.push(new Polyline({ map, path: passedPath.map(ll), strokeColor: SIGNAL, strokeOpacity: 1, strokeWeight: 5, geodesic: true }));
      }

      for (const p of points) {
        const labelled = p.kind === "origin" || p.kind === "destination" || p.kind === "current";
        const icon =
          p.kind === "aircraft"
            ? { path: PLANE_PATH, fillColor: SIGNAL, fillOpacity: 1, strokeColor: INK, strokeWeight: 1.5, scale: 1.4, anchor: new Point(12, 12), rotation: headingDeg ?? 0 }
            : {
                path: SymbolPath.CIRCLE,
                fillColor: FILL[p.kind],
                fillOpacity: 1,
                strokeColor: p.kind === "destination" ? INK : "#ffffff",
                strokeWeight: p.kind === "stop" ? 1.5 : 2.5,
                scale: p.kind === "stop" ? 4 : 8,
                labelOrigin: new Point(0, -2.6),
              };
        drawn.push(
          new Marker({
            map,
            position: { lat: p.lat, lng: p.lon },
            title: p.label,
            icon,
            zIndex: p.kind === "stop" ? 1 : 10,
            label: labelled ? { text: p.label, color: INK, fontSize: "12px", fontWeight: "700", fontFamily: "var(--font-code), monospace" } : undefined,
          }),
        );
      }

      const all = [...path, ...points.map((p) => [p.lat, p.lon] as [number, number])];
      if (all.length === 1) {
        map.setCenter(ll(all[0]));
        map.setZoom(14);
      } else if (all.length) {
        const bounds = new LatLngBounds();
        all.forEach((pt) => bounds.extend(ll(pt)));
        map.fitBounds(bounds, 40);
      }
    })();
    return () => {
      cancelled = true;
      drawn.forEach((o) => o.setMap?.(null));
    };
  }, [points, path, passedPath, headingDeg]);

  if (failed) {
    return (
      <div className={`${heightClass} grid w-full place-items-center rounded-[var(--radius-card)] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500`}>
        The map couldn&apos;t load. Check your connection, or that the Maps key allows this site.
      </div>
    );
  }
  return <div ref={ref} className={`${heightClass} w-full overflow-hidden rounded-[var(--radius-card)] border border-slate-200 bg-paper`} role="img" aria-label="Route map" />;
}
