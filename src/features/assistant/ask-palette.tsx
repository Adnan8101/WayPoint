"use client";

import { useEffect, useState } from "react";
import { Portal } from "@/components/floating";
import { AskBox } from "./ask-box";

/** Ctrl/⌘ + K (or the header button) opens the plain-language search anywhere */
export function AskPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("waypoint:ask", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("waypoint:ask", onOpen);
    };
  }, []);

  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-start justify-center bg-ink/55 px-4 pt-[14vh] backdrop-blur-sm animate-[fade-in_.2s]" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div role="dialog" aria-modal="true" aria-label="Ask WayPoint" className="animate-pop-in w-full max-w-2xl rounded-[26px] bg-ink p-4 shadow-[0_40px_100px_-20px_rgb(0_0_0/0.7),0_0_0_1px_rgb(255_255_255/0.08)] sm:p-5">
          <AskBox autoFocus tone="dark" onDone={() => setOpen(false)} />
          <p className="mt-3 px-1 font-mono text-[11px] uppercase tracking-[0.14em] text-white/35">Enter to go · Esc to close · Answers open live pages, nothing is guessed</p>
        </div>
      </div>
    </Portal>
  );
}

/** Opens the palette from a button */
export const openAsk = () => window.dispatchEvent(new Event("waypoint:ask"));
