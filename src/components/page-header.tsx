import Link from "next/link";
import type { ReactNode } from "react";

const ARC_A = "M-20 230C120 60 330 40 620 120";
const ARC_B = "M40 260C180 140 380 150 620 30";

/** Route arcs that draw themselves in, with a marker travelling the main line */
export function RouteArcs({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 260" fill="none" aria-hidden preserveAspectRatio="xMidYMid slice">
      <path d={ARC_A} stroke="#ffc21a" strokeOpacity=".22" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      <path d={ARC_A} className="draw" style={{ ["--len" as string]: 720 }} stroke="#ffc21a" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round" />
      <path d={ARC_B} stroke="#fff" strokeOpacity=".12" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      <path d="M200 270C260 190 420 170 520 -10" stroke="#fff" strokeOpacity=".07" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" />
      <Rider path={ARC_B} dur="11s" begin="1.2s" />
      <circle cx="455" cy="88" r="4.5" fill="#ffc21a" />
      <circle cx="455" cy="88" r="12" stroke="#ffc21a" strokeOpacity=".4">
        <animate attributeName="r" values="6;20" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values=".6;0" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="170" cy="118" r="3" fill="#fff" fillOpacity=".5" />
    </svg>
  );
}

/** A glowing dot that travels an SVG path, fading in and out at the ends */
export function Rider({ path, dur, begin = "0s", color = "#fff", r = 3 }: { path: string; dur: string; begin?: string; color?: string; r?: number }) {
  return (
    <g opacity="0">
      <circle r={r} fill={color} />
      <circle r={r * 3} fill={color} fillOpacity=".14" />
      <animateMotion path={path} dur={dur} begin={begin} repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .55 1" />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.1;.9;1" dur={dur} begin={begin} repeatCount="indefinite" />
    </g>
  );
}

/** Carbon page masthead. The SearchPanel that follows overlaps its bottom edge. */
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="grain relative overflow-hidden bg-ink text-white">
      <div className="glow-signal absolute inset-0" aria-hidden />
      <div className="grid-lines absolute inset-0" aria-hidden />
      <RouteArcs className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-[62%] md:block" />
      <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-10 sm:px-6 sm:pt-14">
        <nav aria-label="Breadcrumb" className="animate-fade-up flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.12em] text-white/45">
          <Link href="/" className="transition-colors hover:text-signal">Home</Link>
          {eyebrow && (
            <>
              <span className="text-white/25">/</span>
              <span className="inline-flex items-center gap-1.5 text-signal">
                <span className="size-1.5 rounded-full bg-signal" aria-hidden />
                {eyebrow}
              </span>
            </>
          )}
        </nav>
        <h1 className="font-display animate-fade-up mt-5 max-w-3xl text-[42px] font-bold sm:text-[64px]" style={{ animationDelay: "80ms" }}>
          {title}
        </h1>
        {description && (
          <p className="animate-fade-up mt-4 max-w-xl text-[17px] leading-relaxed text-white/60" style={{ animationDelay: "160ms" }}>
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/** Search card lifted over the masthead, cut like a ticket stub */
export function SearchPanel({ children }: { children: ReactNode }) {
  return (
    <div className="animate-fade-up relative mx-auto -mt-20 max-w-7xl px-4 sm:px-6" style={{ animationDelay: "220ms" }}>
      <div className="relative rounded-[24px] bg-white p-4 shadow-[var(--shadow-pop)] sm:p-6">
        <span className="absolute left-6 top-0 h-[3px] w-16 rounded-b-full bg-signal sm:left-8" aria-hidden />
        <span className="absolute -left-2.5 bottom-7 size-5 rounded-full bg-paper shadow-[inset_-2px_0_3px_rgb(29_22_12/0.08)]" aria-hidden />
        <span className="absolute -right-2.5 bottom-7 size-5 rounded-full bg-paper shadow-[inset_2px_0_3px_rgb(29_22_12/0.08)]" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`mx-auto mt-12 max-w-7xl px-4 sm:px-6 ${className ?? ""}`}>{children}</section>;
}

export function RuleHeading({ children, action, sub, index }: { children: ReactNode; action?: ReactNode; sub?: ReactNode; index?: string }) {
  return (
    <div data-reveal className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        {index && <p className="label mb-3 flex items-center gap-2"><span className="h-px w-6 bg-slate-400" aria-hidden />{index}</p>}
        <h2 className="font-display text-[30px] font-bold text-ink sm:text-[40px]">{children}</h2>
        {sub && <p className="mt-2 text-[15.5px] text-slate-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
