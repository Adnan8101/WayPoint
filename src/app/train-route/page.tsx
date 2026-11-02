import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { ScheduleView } from "@/features/trains/schedule-view";

export const metadata: Metadata = {
  title: "Train Route Map",
  description: "Visual route overview for any Indian Railways train: all stations, distances between stops, halts and journey direction.",
  alternates: { canonical: "/train-route" },
};

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Indian Railways" title="Train Route" description="Every station on the route, with distances, halts and a map where reliable coordinates exist." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <ScheduleView mode="route" />
      </Suspense>
    </>
  );
}
