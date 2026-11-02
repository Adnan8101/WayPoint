import type { Metadata } from "next";
import { PageHeader, RuleHeading, Section } from "@/components/page-header";
import { Card } from "@/components/ui";
import { Faq } from "@/components/faq";
import { BuildingIcon, CheckIcon, TrainIcon, TicketIcon } from "@/components/icons";
import { GUIDES } from "@/lib/content";
import { WeatherTool } from "@/features/travel/weather-tool";
import { TimezoneTool } from "@/features/travel/timezone-tool";

export const metadata: Metadata = {
  title: "Travel Information: Weather, Time Zones & Guides",
  description: "Destination weather and forecasts, local time and UTC offsets, airport and railway station guides, travel tips and FAQs.",
  alternates: { canonical: "/travel-information" },
};

const sections = [
  { id: "weather", label: "Weather" },
  { id: "time-zones", label: "Time zones" },
  { id: "guides", label: "Guides" },
  { id: "faq", label: "FAQ" },
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Before you go" title="Travel information" description="Weather at the other end, what time it is there, and practical notes worth knowing before you travel.">
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
          <RuleHeading sub="Current conditions and a 7-day forecast.">Weather</RuleHeading>
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

      <Section>
        <div id="guides" className="scroll-mt-28" />
        <RuleHeading sub="Practical notes for airports, stations and the journey itself.">Travel guides</RuleHeading>
        <div className="grid gap-4 lg:grid-cols-2">
          <Guide title="At the airport" icon={<BuildingIcon width={19} height={19} />} items={GUIDES.airport} />
          <Guide title="At the station" icon={<TrainIcon width={19} height={19} />} items={GUIDES.station} />
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><CheckIcon width={19} height={19} /></span>
              <h3 className="text-lg font-semibold text-ink">Small things that help</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {GUIDES.tips.map((t) => (
                <li key={t} className="flex gap-3 text-[14.5px] leading-relaxed text-slate-600">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
          <Guide title="Passenger information" icon={<TicketIcon width={19} height={19} />} items={GUIDES.passenger} />
        </div>
      </Section>

      <Section>
        <div id="faq" className="scroll-mt-28" />
        <RuleHeading>Frequently asked questions</RuleHeading>
        <Faq />
      </Section>
    </>
  );
}

function Guide({ title, icon, items }: { title: string; icon: React.ReactNode; items: { title: string; body: string }[] }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
      </div>
      <dl className="mt-4 space-y-4">
        {items.map((i) => (
          <div key={i.title}>
            <dt className="text-[14.5px] font-medium text-ink">{i.title}</dt>
            <dd className="mt-0.5 text-[14.5px] leading-relaxed text-slate-500">{i.body}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
