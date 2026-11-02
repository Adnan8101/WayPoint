"use client";

import { useMemo, useState } from "react";
import type { RunningStation, TrainRunningStatus } from "@/lib/types";
import { SelectField } from "@/components/ui";
import { GetThere } from "@/features/places/get-there";

/** Expected departure at a stop as an ISO time: journey start date + day offset + IST wall time */
function departureIso(journeyDate: string, s: RunningStation): string | undefined {
  const hhmm = [s.actualDeparture?.value, s.scheduledDeparture, s.actualArrival?.value, s.scheduledArrival].find((v) => v && /^\d{2}:\d{2}$/.test(v));
  if (!hhmm || !/^\d{4}-\d{2}-\d{2}$/.test(journeyDate)) return undefined;
  const base = new Date(`${journeyDate}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + Math.max(0, (s.day ?? 1) - 1));
  return `${base.toISOString().slice(0, 10)}T${hhmm}:00+05:30`;
}

/** "Where do you board?" then door-to-platform timing for that stop */
export function BoardingPlanner({ d }: { d: TrainRunningStatus }) {
  const stops = useMemo(
    () => d.stations.filter((s) => s.state === "upcoming" && s.name && departureIso(d.journeyDate, s) && Date.parse(departureIso(d.journeyDate, s)!) > Date.now()),
    [d],
  );
  const [pick, setPick] = useState(0);
  if (!stops.length) return null;
  const stop = stops[Math.min(pick, stops.length - 1)];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label">Catching this train?</p>
          <h3 className="font-display mt-2 text-[26px] font-bold text-ink">Plan your trip to the platform</h3>
        </div>
        <SelectField
          id="board-at"
          label="I board at"
          value={String(pick)}
          onChange={(v) => setPick(Number(v))}
          options={stops.map((s, i) => ({ value: String(i), label: `${s.name}${s.code ? ` (${s.code})` : ""}` }))}
          className="w-72"
        />
      </div>
      <GetThere
        key={`${stop.code}-${stop.name}`}
        title={`Get to ${stop.name}`}
        destination={{ label: stop.name, address: `${stop.name} railway station, India` }}
        departAt={departureIso(d.journeyDate, stop)}
        buffers={[10, 20, 30, 45]}
        defaultBuffer={20}
      />
    </div>
  );
}
