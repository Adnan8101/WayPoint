"use client";

import { useRef, useState } from "react";
import type { ApiResponse } from "@/lib/types";
import { cx } from "@/lib/format";

/** Downscale to keep uploads small; tickets stay legible at this size */
async function toDataUrl(file: File, max = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Reads the PNR off a ticket photo or screenshot. The image is never stored. */
export function ScanTicket({ onPnr }: { onPnr: (pnr: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string }>();

  const read = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setNote(undefined);
    try {
      const image = await toDataUrl(file);
      const res = await fetch("/api/assistant/ticket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      const r = (await res.json()) as ApiResponse<{ pnr: string }>;
      if (r.ok) {
        onPnr(r.data.pnr);
        setNote({ ok: true, text: "PNR read from your ticket. Check it, then press Check PNR status." });
      } else setNote({ ok: false, text: r.error.message });
    } catch {
      setNote({ ok: false, text: "That image couldn't be read. Try a JPG or PNG, or type the PNR." });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => read(e.target.files?.[0])} aria-hidden />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-slate-300 px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 transition-colors hover:border-ink hover:text-ink disabled:opacity-60"
      >
        {busy ? (
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10" />
          </svg>
        )}
        {busy ? "Reading your ticket…" : "Scan ticket or screenshot"}
      </button>
      {note && <p role="status" className={cx("text-[12.5px] font-medium", note.ok ? "text-brand-700" : "text-red-600")}>{note.text}</p>}
    </div>
  );
}
