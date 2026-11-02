import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { ScheduleView } from "@/features/trains/schedule-view";

export const metadata: Metadata = {
  title: "Train Schedule & Timetable",
  description: "Complete station-wise timetable for any Indian Railways train: arrival, departure, halt, day and distance.",
  alternates: { canonical: "/train-schedule" },
};

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Indian Railways" title="Train Schedule" description="Station-wise timetable, running days, halts, distances and route map." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <ScheduleView />
      </Suspense>
    </>
  );
}
