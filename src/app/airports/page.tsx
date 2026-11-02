import type { Metadata } from "next";
import { PageHeader, RuleHeading, SearchPanel, Section } from "@/components/page-header";
import { AirportSearchForm } from "@/components/forms";
import { RecentList } from "@/components/recent-list";

export const metadata: Metadata = {
  title: "Airport Information: Arrivals & Departures",
  description: "Search any airport worldwide by name, IATA/ICAO code or city, and view live arrivals and departures boards.",
  alternates: { canonical: "/airports" },
};

export default function Page() {
  return (
    <>
      <PageHeader art="airport" eyebrow="Flights" title="Airport Information" description="Codes, locations, local time and live arrivals and departures for airports worldwide." />
      <SearchPanel><AirportSearchForm /></SearchPanel>
      <Section>
        <RuleHeading sub="Thousands of airports with scheduled service are searchable above.">Your airports</RuleHeading>
        <RecentList kinds={["airport"]} title="Recently viewed airports" />
      </Section>
    </>
  );
}
