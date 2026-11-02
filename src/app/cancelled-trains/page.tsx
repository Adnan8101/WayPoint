import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { CancelledView } from "@/features/trains/cancelled-view";

export const metadata: Metadata = {
  title: "Cancelled Trains Today",
  description: "Today's fully and partially cancelled Indian Railways trains. Search by train number, name or station.",
  alternates: { canonical: "/cancelled-trains" },
};

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Indian Railways" title="Cancelled Trains" description="Today's full and partial cancellations. Search to see if your train is affected." />
      <CancelledView />
    </>
  );
}
