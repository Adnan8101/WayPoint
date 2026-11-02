"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { Flight } from "@/lib/types";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { Skeleton } from "@/components/result-states";
import { greatCircle, type MapPoint } from "@/components/route-map";
import { AlertIcon } from "@/components/icons";

const RouteMap = dynamic(() => import("@/components/route-map"), { ssr: false, loading: () => <Skeleton className="h-96 w-full" /> });

export function FlightMap({ flight }: { flight: Flight }) {
  const dep = flight.departure.airport;
  const arr = flight.arrival.airport;
  const { points, path, passed } = useMemo(() => {
    const pts: MapPoint[] = [];
    let path: [number, number][] = [];
    let passed: [number, number][] | undefined;
    if (dep.lat !== undefined && dep.lon !== undefined) pts.push({ lat: dep.lat, lon: dep.lon, label: dep.iata ?? dep.name, kind: "origin" });
    if (arr.lat !== undefined && arr.lon !== undefined) pts.push({ lat: arr.lat, lon: arr.lon, label: arr.iata ?? arr.name, kind: "destination" });
    if (pts.length === 2) path = greatCircle([pts[0].lat, pts[0].lon], [pts[1].lat, pts[1].lon]);
    if (flight.position) {
      pts.push({ lat: flight.position.lat, lon: flight.position.lon, label: `${flight.number} (reported position)`, kind: "aircraft" });
      if (dep.lat !== undefined && dep.lon !== undefined) passed = greatCircle([dep.lat, dep.lon], [flight.position.lat, flight.position.lon], 32);
    }
    return { points: pts, path, passed };
  }, [flight, dep, arr]);

  if (points.length < 2 && !flight.position) return null;
  const airborne = flight.status === "In Air" || flight.status === "Departed";
  return (
    <div className="mt-6 space-y-2">
      <RouteMap points={points} path={path} passedPath={passed} heightClass="h-96" headingDeg={flight.position?.trackDeg} />
      {flight.position ? (
        <p className="text-xs text-slate-500">
          Aircraft position reported {fmtRelative(flight.position.reportedAt)}{flight.position.reportedAt ? ` (${fmtDateTime(flight.position.reportedAt)})` : ""}. The route line is the great-circle path, not the actual flight path.
        </p>
      ) : (
        airborne && (
          <p className="flex items-start gap-2 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />
            Live aircraft position is not available right now. The line shows the planned great-circle route.
          </p>
        )
      )}
    </div>
  );
}
