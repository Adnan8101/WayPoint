import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24">
      <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[13px] font-medium text-brand-800">Error 404</p>
      <h1 className="font-display mt-3 text-6xl font-semibold text-ink sm:text-8xl">Wrong platform</h1>
      <p className="mt-4 max-w-md text-lg text-slate-600">This page doesn&apos;t exist, or it has moved. These might be what you were after:</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded-xl bg-ink px-5 py-2.5 font-semibold text-white hover:bg-navy-700">Home</Link>
        <Link href="/pnr-status" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-ink hover:bg-slate-50">PNR status</Link>
        <Link href="/train-status" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-ink hover:bg-slate-50">Train status</Link>
        <Link href="/flight-status" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 font-semibold text-ink hover:bg-slate-50">Flight status</Link>
      </div>
    </div>
  );
}
