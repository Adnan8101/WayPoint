import { FAQS } from "@/lib/content";

export function Faq({ items = FAQS }: { items?: { q: string; a: string }[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="space-y-2">
      {items.map((f) => (
        <details key={f.q} className="group rounded-xl border border-slate-200 bg-white px-5 transition-colors open:border-slate-300 open:shadow-[var(--shadow-card)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] font-medium text-ink">
            {f.q}
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-transform group-open:rotate-45 group-open:bg-brand-50 group-open:text-brand-700" aria-hidden>
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            </span>
          </summary>
          <p className="max-w-2xl pb-5 text-[14.5px] leading-relaxed text-slate-600">{f.a}</p>
        </details>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
