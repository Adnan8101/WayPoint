"use client";

import Link from "next/link";
import { useEffect } from "react";

// Route-level error boundary: a rendering failure in one page doesn't take down the shell.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24">
      <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[13px] font-medium text-brand-800">Unexpected error</p>
      <h1 className="font-display mt-3 text-6xl font-semibold text-ink sm:text-8xl">Delayed</h1>
      <p className="mt-4 max-w-md text-lg text-slate-600">Something on this page broke. It&apos;s on our side, not yours. Try again, and it&apos;ll usually work.</p>
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="rounded-xl bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy-700">Try again</button>
        <Link href="/" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-ink hover:bg-slate-50">Home</Link>
      </div>
    </div>
  );
}
