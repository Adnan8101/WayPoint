"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SplitFlap } from "@/components/motion";

// Route-level error boundary: a rendering failure in one page doesn't take down the shell.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="grain relative overflow-hidden bg-ink text-white">
      <div className="hazard absolute inset-x-0 top-0 h-2 opacity-90" aria-hidden />
      <div className="grid-lines absolute inset-0" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
        <SplitFlap text="DELAYED" className="animate-fade-up" tileClassName="h-14 w-10 text-[34px] font-bold text-signal sm:h-20 sm:w-14 sm:text-[52px] rounded-md" />
        <h1 className="font-display animate-fade-up mt-10 text-[44px] font-bold sm:text-[72px]" style={{ animationDelay: "120ms" }}>Something broke on our side.</h1>
        <p className="animate-fade-up mt-5 max-w-md text-lg text-white/60" style={{ animationDelay: "200ms" }}>
          It&apos;s not you. Try again, and it&apos;ll usually work.
        </p>
        <div className="animate-fade-up mt-10 flex gap-3" style={{ animationDelay: "280ms" }}>
          <button type="button" onClick={reset} className="rounded-full bg-signal px-6 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5">Try again</button>
          <Link href="/" className="rounded-full border border-white/15 px-6 py-3 font-semibold text-white transition-colors hover:border-signal hover:text-signal">Home</Link>
        </div>
      </div>
    </section>
  );
}
