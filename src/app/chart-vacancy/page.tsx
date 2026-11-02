import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { VacancyView } from "@/features/trains/vacancy-view";

export const metadata: Metadata = {
  title: "Vacant Berths After Chart Preparation",
  description: "See vacant berths on an Indian Railways train after the reservation chart is prepared, coach by coach, with the stretch each berth is free for.",
  alternates: { canonical: "/chart-vacancy" },
};

export default function Page() {
  return (
    <>
      <PageHeader art="seats" eyebrow="Indian Railways" title="Vacant Berths" description="After the chart is prepared: every free berth, coach by coach, and the stretch it's free for." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <VacancyView />
      </Suspense>
    </>
  );
}
