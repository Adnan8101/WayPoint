import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { FlightStatusView } from "@/features/flights/flight-status-view";

export const metadata: Metadata = {
  title: "Live Flight Status",
  description: "Check live flight status by flight number: departure and arrival times, gates, terminals, delays and aircraft.",
  alternates: { canonical: "/flight-status" },
};

export default function Page() {
  return (
    <>
      <PageHeader art="flight" eyebrow="Flights" title="Flight Status" description="Live departure and arrival times, terminals, gates and delays for any flight." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <FlightStatusView />
      </Suspense>
    </>
  );
}
