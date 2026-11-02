import type { ReactNode } from "react";

/** Decorative dashed route arcs for dark bands */
export function RouteArcs({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 260" fill="none" aria-hidden preserveAspectRatio="xMidYMid slice">
      <path d="M-20 230C120 60 330 40 620 120" stroke="#3ee0b0" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      <path d="M40 260C180 140 380 150 620 30" stroke="#fff" strokeOpacity=".12" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      <path d="M200 270C260 190 420 170 520 -10" stroke="#fff" strokeOpacity=".08" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      <circle cx="455" cy="88" r="4" fill="#3ee0b0" />
      <circle cx="455" cy="88" r="11" stroke="#3ee0b0" strokeOpacity=".35" />
      <circle cx="170" cy="118" r="3" fill="#fff" fillOpacity=".5" />
    </svg>
  );
}

/** Dark navy page masthead. The SearchPanel that follows overlaps its bottom edge. */
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="route-pattern absolute inset-0" aria-hidden />
      <RouteArcs className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[60%] md:block" />
      <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-12 sm:pt-16">
        {eyebrow && (
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12.5px] font-medium text-slate-200">
            <span className="size-1.5 rounded-full bg-mint" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display mt-4 max-w-3xl text-4xl font-semibold sm:text-[52px]">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-[16.5px] leading-relaxed text-slate-300">{description}</p>}
        {children}
      </div>
    </section>
  );
}

/** White search card lifted over the masthead */
export function SearchPanel({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto -mt-20 max-w-6xl px-4">
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[var(--shadow-pop)] sm:p-6">{children}</div>
    </div>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`mx-auto mt-10 max-w-6xl px-4 ${className ?? ""}`}>{children}</section>;
}

export function RuleHeading({ children, action, sub }: { children: ReactNode; action?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-[28px]">{children}</h2>
        {sub && <p className="mt-1 text-[15px] text-slate-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
