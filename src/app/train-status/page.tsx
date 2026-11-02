import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { TrainStatusView } from "@/features/trains/train-status-view";

export const metadata: Metadata = {
  title: "Live Train Running Status: Where Is My Train",
  description: "Track the live running status of any Indian Railways train: current location, delay, last reported station and station-wise timings.",
  alternates: { canonical: "/train-status" },
};

export default function Page() {
  return (
    <>
      <PageHeader art="train" eyebrow="Indian Railways" title="Train Running Status" description="Live location, delays and station-by-station timings for any train." />
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        <TrainStatusView />
      </Suspense>
    </>
  );
}
