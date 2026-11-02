"use client";

import { useEffect, useState } from "react";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";
import { currentLanguage, setLanguage } from "./translator";

/** Interface language picker; the page reloads in the chosen language */
export function LanguagePicker({ className }: { className?: string }) {
  const [lang, setLang] = useState<LanguageCode>("en");
  useEffect(() => setLang(currentLanguage()), []);

  return (
    <label className={`relative flex items-center ${className ?? ""}`} data-no-translate>
      <span className="sr-only">Language</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden className="pointer-events-none absolute left-2.5 text-white/60">
        <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
      <select
        value={lang}
        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
        className="h-9 cursor-pointer appearance-none rounded-full border border-white/10 bg-white/[0.04] pl-8 pr-3 text-[13px] font-medium text-white/80 outline-none transition-colors hover:border-white/25 focus-visible:border-signal [&>option]:text-ink"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.native}</option>
        ))}
      </select>
    </label>
  );
}
