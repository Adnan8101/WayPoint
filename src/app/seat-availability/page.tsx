import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { SeatsView } from "@/features/trains/seats-view";

export const metadata: Metadata = {
  title: "Train Seat Availability & Fare",
  description: "Check Indian Railways seat availability across the coming days and the fare for every class, with the full breakup.",
  alternates: { canonical: "/seat-availability" },
};

export default function Page() {
  return (
    <>
      <PageHeader art="seats" eyebrow="Indian Railways" title="Seats & Fare" description="Availability across the coming days and the fare for every class, with the full breakup." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <SeatsView />
      </Suspense>
    </>
  );
}
