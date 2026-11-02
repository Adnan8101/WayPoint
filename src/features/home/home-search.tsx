"use client";

import { useState } from "react";
import { cx } from "@/lib/format";
import { AirportSearchForm, FlightSearchForm, FlightStatusForm, PnrForm, SeatsForm, TrainNumberForm, TrainStatusForm, TrainsBetweenForm } from "@/components/forms";
import { PlaneIcon, TrainIcon } from "@/components/icons";
import { useIndicator } from "@/components/motion";

type Category = "trains" | "flights";
const TOOLS = {
  trains: [
    { id: "pnr", label: "PNR Status" },
    { id: "running", label: "Live Train Status" },
    { id: "seats", label: "Seats & Fare" },
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
  const catThumb = useIndicator<HTMLDivElement>(cat);
  const toolLine = useIndicator<HTMLDivElement>(`${cat}-${active}`);

  return (
    <div className="relative rounded-[28px] bg-white p-2 text-ink shadow-[0_50px_100px_-30px_rgb(0_0_0/0.6),0_0_0_1px_rgb(255_255_255/0.08)]">
      <div className="flex flex-col gap-3 px-2 pb-1 pt-2 sm:flex-row sm:items-center sm:gap-6 sm:px-3">
        <div ref={catThumb.ref} role="tablist" aria-label="Travel category" className="relative inline-flex self-start rounded-full bg-slate-100 p-1 ring-1 ring-inset ring-slate-200/70">
          {catThumb.box && (
            <span
              className="absolute inset-y-1 rounded-full bg-ink shadow-[0_6px_14px_-6px_rgb(11_13_16/0.7)] transition-[left,width] duration-500 ease-[var(--ease-out-expo)]"
              style={{ left: catThumb.box.left, width: catThumb.box.width }}
              aria-hidden
            />
          )}
          {(["trains", "flights"] as const).map((c) => (
            <button
              key={c}
              role="tab"
              type="button"
              aria-selected={cat === c}
              onClick={() => setCat(c)}
              className={cx(
                "relative flex items-center gap-2 rounded-full px-5 py-2 text-[14.5px] font-semibold capitalize transition-colors duration-300",
                cat === c ? (catThumb.box ? "text-white" : "bg-ink text-white") : "text-slate-500 hover:text-ink",
              )}
            >
              {c === "trains" ? (
                <TrainIcon width={17} height={17} className={cx("transition-colors", cat === c && "text-signal")} />
              ) : (
                <PlaneIcon width={17} height={17} className={cx("transition-colors", cat === c && "text-signal")} />
              )}
              {c}
            </button>
          ))}
        </div>
        <div ref={toolLine.ref} role="tablist" aria-label={`${cat} tools`} className="no-scrollbar relative -mx-1 flex gap-1 overflow-x-auto px-1">
          {TOOLS[cat].map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active === t.id}
              onClick={() => setTool({ ...tool, [cat]: t.id })}
              className={cx(
                "relative whitespace-nowrap px-3 py-2.5 text-[14px] font-medium transition-colors",
                active === t.id ? "text-ink" : "text-slate-400 hover:text-slate-700",
              )}
            >
              {t.label}
            </button>
          ))}
          {toolLine.box && (
            <span
              className="absolute bottom-0.5 h-[3px] rounded-full bg-signal transition-[left,width] duration-500 ease-[var(--ease-out-expo)]"
              style={{ left: toolLine.box.left + 12, width: toolLine.box.width - 24 }}
              aria-hidden
            />
          )}
        </div>
      </div>

      {/* Perforated tear line between the stub and the form */}
      <div className="relative my-2 h-px" aria-hidden>
        <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-slate-200" />
        <span className="absolute -left-5 -top-3 size-6 rounded-full bg-ink" />
        <span className="absolute -right-5 -top-3 size-6 rounded-full bg-ink" />
      </div>

      <div key={`${cat}-${active}`} className="animate-fade-up rounded-[22px] p-4 sm:p-5" role="tabpanel">
        {cat === "flights" && active === "status" && <FlightStatusForm />}
        {cat === "flights" && active === "search" && <FlightSearchForm />}
        {cat === "flights" && active === "tracker" && <FlightStatusForm target="/flight-tracker" />}
        {cat === "flights" && active === "airport" && <AirportSearchForm />}
        {cat === "trains" && active === "pnr" && <PnrForm />}
        {cat === "trains" && active === "running" && <TrainStatusForm />}
        {cat === "trains" && active === "seats" && <SeatsForm />}
        {cat === "trains" && active === "between" && <TrainsBetweenForm />}
        {cat === "trains" && active === "schedule" && <TrainNumberForm target="/train-schedule" cta="View schedule" />}
      </div>
    </div>
  );
}
