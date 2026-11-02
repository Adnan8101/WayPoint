import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ResultSkeleton } from "@/components/result-states";
import { SeatsView } from "@/features/trains/seats-view";
import { PlannerView } from "@/features/planner/planner-view";
import { VacancyView } from "@/features/trains/vacancy-view";
import { cx } from "@/lib/format";

export const metadata: Metadata = {
  title: "Train Seats: Availability, Fare, Planner & Vacant Berths",
  description: "Check Indian Railways seat availability and fares, plan a journey that has seats, or find vacant berths after the chart is prepared.",
  alternates: { canonical: "/seats" },
};

const TABS = [
  { id: "availability", label: "Availability & fare" },
  { id: "planner", label: "Journey planner" },
  { id: "vacancy", label: "Vacant berths" },
] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: raw } = await searchParams;
  const tab = TABS.find((t) => t.id === raw)?.id ?? "availability";
  return (
    <>
      <PageHeader eyebrow="Indian Railways" title="Seats">
        <nav aria-label="Seat tools" className="mt-7 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/seats?tab=${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={cx(
                "rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium transition-colors",
                tab === t.id ? "border-signal bg-signal text-ink" : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white",
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </PageHeader>
      <Suspense fallback={<div className="relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6"><ResultSkeleton rows={1} /></div>}>
        {tab === "availability" && <SeatsView />}
        {tab === "planner" && <PlannerView />}
        {tab === "vacancy" && <VacancyView />}
      </Suspense>
    </>
  );
}
