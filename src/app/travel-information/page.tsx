import type { Metadata } from "next";
import { PageHeader, RuleHeading, Section } from "@/components/page-header";
import { Card } from "@/components/ui";
import { WeatherTool } from "@/features/travel/weather-tool";
import { TimezoneTool } from "@/features/travel/timezone-tool";

export const metadata: Metadata = {
  title: "Travel Information: Weather & Time Zones",
  description: "Live weather, the next 24 hours and a 5-day forecast for any city or area, plus local time anywhere compared with yours.",
  alternates: { canonical: "/travel-information" },
};

const sections = [
  { id: "weather", label: "Weather" },
  { id: "time-zones", label: "Time zones" },
];

export default function Page() {
  return (
    <>
      <PageHeader art="travel" eyebrow="Before you go" title="Travel information" description="Weather at the other end and what time it is there, for anywhere you're heading.">
        <nav aria-label="On this page" className="mt-7 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13.5px] font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white">
              {s.label}
            </a>
          ))}
        </nav>
      </PageHeader>

      <Section className="relative -mt-20">
        <Card className="p-5 sm:p-7">
          <div id="weather" className="scroll-mt-28" />
          <RuleHeading sub="Current conditions, the next 24 hours and a 5-day forecast for any city or area.">Weather</RuleHeading>
          <WeatherTool />
        </Card>
      </Section>

      <Section>
        <Card className="p-5 sm:p-7">
          <div id="time-zones" className="scroll-mt-28" />
          <RuleHeading sub="Local time anywhere, compared with yours.">Time zones</RuleHeading>
          <TimezoneTool />
        </Card>
      </Section>
    </>
  );
}
