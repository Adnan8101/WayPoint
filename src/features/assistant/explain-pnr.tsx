"use client";

import { useState } from "react";
import type { ApiResponse, PnrStatus } from "@/lib/types";
import { LANGUAGES } from "@/lib/languages";
import { currentLanguage } from "@/features/i18n/translator";

/** Plain-language explanation of a PNR result. Sends status codes only, never the PNR or names. */
export function ExplainPnr({ d }: { d: PnrStatus }) {
  const [text, setText] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const explain = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/assistant/explain-pnr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: currentLanguage(),
          chartPrepared: d.chartPrepared,
          travelClass: d.travelClass,
          quota: d.quota,
          passengers: d.passengers.map((p) => ({ currentStatus: p.currentStatus, bookingStatus: p.bookingStatus || undefined })),
        }),
      });
      const r = (await res.json()) as ApiResponse<{ text: string }>;
      if (r.ok) setText(r.data.text);
      else setError(r.error.message);
    } catch {
      setError("Couldn't reach the assistant. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const lang = LANGUAGES.find((l) => l.code === currentLanguage());
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label">In plain words</p>
          <p className="mt-1 font-semibold text-ink">What does this status mean for me?</p>
        </div>
        {!text && (
          <button
            type="button"
            onClick={explain}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-signal hover:text-ink disabled:opacity-60"
          >
            {busy && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
            {busy ? "Explaining…" : `Explain${lang && lang.code !== "en" ? ` in ${lang.native}` : ""}`}
          </button>
        )}
      </div>
      {text && (
        <div className="animate-fade-up mt-4 whitespace-pre-line border-l-2 border-signal pl-4 text-[15px] leading-relaxed text-slate-700" data-no-translate>
          {text}
        </div>
      )}
      {error && <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>}
      <p className="mt-3 text-[12px] text-slate-400">Written by Gemini from your status codes only. It doesn&apos;t predict confirmation; check IRCTC for rules and refunds.</p>
    </div>
  );
}
