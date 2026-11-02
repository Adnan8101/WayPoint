import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PnrView } from "@/features/trains/pnr-view";

export const metadata: Metadata = {
  title: "PNR Status: Indian Railways Booking Status",
  description: "Check Indian Railways PNR status: confirmation, RAC and waiting-list status, coach and berth, and chart preparation.",
  alternates: { canonical: "/pnr-status" },
};

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Indian Railways" title="PNR Status" description="Check confirmation, RAC or waiting-list status, coach and berth for every passenger." />
      <PnrView />
    </>
  );
}
