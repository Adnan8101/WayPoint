import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { PlannerView } from "@/features/planner/planner-view";

export const metadata: Metadata = {
  title: "Journey Planner: Trains With Seats",
  description: "Plan a train journey that has seats: every direct train with availability on your date, the nearest dates with seats, and journeys with one change.",
  alternates: { canonical: "/planner" },
};

export default function Page() {
  return (
    <>
      <PageHeader art="route" eyebrow="Indian Railways" title="Journey Planner" description="Trains with seats on your date, the nearest dates if it's full, and journeys with one change." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <PlannerView />
      </Suspense>
    </>
  );
}
