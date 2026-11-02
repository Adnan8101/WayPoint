import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { FlightSearchView } from "@/features/flights/flight-search-view";

export const metadata: Metadata = {
  title: "Flight Search: Flights Between Airports",
  description: "Find direct flights between two airports on a date, with departure and arrival times, duration and aircraft.",
  alternates: { canonical: "/flight-search" },
};

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Flights" title="Flight Search" description="Discover direct flights between airports, with timings, duration and status." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={2} /></div>}>
        <FlightSearchView />
      </Suspense>
    </>
  );
}
