import type { Metadata } from "next";
import { PageHeader, RuleHeading, SearchPanel, Section } from "@/components/page-header";
import { StationSearchForm } from "@/components/forms";
import { RecentList } from "@/components/recent-list";

export const metadata: Metadata = {
  title: "Railway Station Information: Arrivals & Departures",
  description: "Search any Indian Railways station by name or code and view live arrivals, departures, platforms and the full-day timetable.",
  alternates: { canonical: "/railway-stations" },
};

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Indian Railways" title="Railway Station Information" description="Live arrivals and departures, platforms and the full-day timetable for any station." />
      <SearchPanel><StationSearchForm /></SearchPanel>
      <Section>
        <RuleHeading sub="Every station in the Indian Railways network is searchable above.">Your stations</RuleHeading>
        <RecentList kinds={["station"]} title="Recently viewed stations" />
      </Section>
    </>
  );
}
