import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { BetweenView } from "@/features/trains/between-view";

export const metadata: Metadata = {
  title: "Trains Between Stations",
  description: "Find all trains between two Indian Railways stations with timings, duration, running days and classes.",
  alternates: { canonical: "/trains-between-stations" },
};

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Indian Railways" title="Trains Between Stations" description="Compare trains by timing, duration, running days and class." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <BetweenView />
      </Suspense>
    </>
  );
}
