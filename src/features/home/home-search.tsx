"use client";

import { useState } from "react";
import { cx } from "@/lib/format";
import { AirportSearchForm, FlightSearchForm, FlightStatusForm, PnrForm, TrainNumberForm, TrainStatusForm, TrainsBetweenForm } from "@/components/forms";
import { PlaneIcon, TrainIcon } from "@/components/icons";

type Category = "trains" | "flights";
const TOOLS = {
  trains: [
    { id: "pnr", label: "PNR Status" },
    { id: "running", label: "Live Train Status" },
    { id: "between", label: "Trains Between Stations" },
    { id: "schedule", label: "Train Schedule" },
  ],
  flights: [
    { id: "status", label: "Flight Status" },
    { id: "search", label: "Search Flights" },
    { id: "tracker", label: "Live Flight Tracker" },
    { id: "airport", label: "Arrivals & Departures" },
  ],
} as const;

export function HomeSearch() {
  const [cat, setCat] = useState<Category>("trains");
  const [tool, setTool] = useState<Record<Category, string>>({ trains: "pnr", flights: "status" });
  const active = tool[cat];

  return (
    <div className="rounded-[22px] bg-white p-2 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)] ring-1 ring-white/10">
      <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Travel category" className="inline-flex self-start rounded-xl bg-slate-100 p-1">
          {(["trains", "flights"] as const).map((c) => (
            <button
              key={c}
              role="tab"
              type="button"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={cx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-[14.5px] font-semibold capitalize transition-all",
                cat === c ? "bg-ink text-white shadow-sm" : "text-slate-600 hover:text-ink",
              )}
            >
              {c === "trains" ? <TrainIcon width={17} height={17} /> : <PlaneIcon width={17} height={17} />} {c}
            </button>
          ))}
        </div>
        <div role="tablist" aria-label={`${cat} tools`} className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {TOOLS[cat].map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active === t.id}
              onClick={() => setTool({ ...tool, [cat]: t.id })}
              className={cx(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors",
                active === t.id ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200" : "text-slate-500 hover:bg-slate-100 hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5" role="tabpanel">
        {cat === "flights" && active === "status" && <FlightStatusForm />}
        {cat === "flights" && active === "search" && <FlightSearchForm />}
        {cat === "flights" && active === "tracker" && <FlightStatusForm target="/flight-tracker" />}
        {cat === "flights" && active === "airport" && <AirportSearchForm />}
        {cat === "trains" && active === "pnr" && <PnrForm />}
        {cat === "trains" && active === "running" && <TrainStatusForm />}
        {cat === "trains" && active === "between" && <TrainsBetweenForm />}
        {cat === "trains" && active === "schedule" && <TrainNumberForm target="/train-schedule" cta="View schedule" />}
      </div>
    </div>
  );
}
