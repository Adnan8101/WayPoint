import Link from "next/link";
import { SplitFlap } from "@/components/motion";

const LINKS = [
  { href: "/pnr-status", label: "PNR status" },
  { href: "/train-status", label: "Train status" },
  { href: "/flight-status", label: "Flight status" },
];

export default function NotFound() {
  return (
    <section className="grain relative overflow-hidden bg-ink text-white">
      <div className="glow-signal absolute inset-0" aria-hidden />
      <div className="grid-lines absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
        <SplitFlap text="404" className="animate-fade-up" tileClassName="h-20 w-14 text-[52px] font-bold text-signal sm:h-28 sm:w-20 sm:text-[76px] rounded-lg" />
        <h1 className="font-display animate-fade-up mt-10 text-[56px] font-bold sm:text-[96px]" style={{ animationDelay: "120ms" }}>Wrong platform.</h1>
        <p className="animate-fade-up mt-5 max-w-md text-lg text-white/60" style={{ animationDelay: "200ms" }}>
          This page doesn&apos;t exist, or it has moved. These might be what you were after:
        </p>
        <div className="animate-fade-up mt-10 flex flex-wrap gap-3" style={{ animationDelay: "280ms" }}>
          <Link href="/" className="rounded-full bg-signal px-6 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5">Home</Link>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition-colors hover:border-signal hover:text-signal">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
