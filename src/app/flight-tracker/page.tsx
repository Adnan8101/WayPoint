import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { FlightTrackerView } from "@/features/flights/flight-tracker-view";

export const metadata: Metadata = {
  title: "Flight Tracker: Live Flight Map",
  description: "Track a flight on the map with route, progress, aircraft details and the latest reported position.",
  alternates: { canonical: "/flight-tracker" },
};

export default function Page() {
  return (
    <>
      <PageHeader art="tracker" eyebrow="Flights" title="Flight Tracker" description="Follow a flight's route and progress, with the live aircraft position when the provider reports it." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <FlightTrackerView />
      </Suspense>
    </>
  );
}
