"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ApiResponse, AssistantIntent } from "@/lib/types";
import { cx } from "@/lib/format";
import { ArrowRightIcon } from "@/components/icons";

/** Sends a plain-language request to the assistant and opens the page it maps to */
export async function ask(q: string): Promise<ApiResponse<AssistantIntent>> {
  try {
    const res = await fetch("/api/assistant/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }), cache: "no-store" });
    return (await res.json()) as ApiResponse<AssistantIntent>;
  } catch {
    return { ok: false, error: { code: "SERVICE_FAILURE", message: "Network error. Check your connection and try again." } };
  }
}

/** Plain-language search: "Delhi to Mumbai tomorrow night, AC" → the right page, filled in */
export function AskBox({ autoFocus, onDone, tone = "light" }: { autoFocus?: boolean; onDone?: () => void; tone?: "light" | "dark" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; text: string }>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 3 || busy) return;
    setBusy(true);
    setNote(undefined);
    const r = await ask(q.trim());
    setBusy(false);
    if (!r.ok) return setNote({ kind: "err", text: r.error.message });
    setNote({ kind: "ok", text: r.data.summary });
    router.push(r.data.href);
    onDone?.();
  };

  const dark = tone === "dark";
  return (
    <form onSubmit={submit} className="space-y-2" role="search" aria-label="Ask in your own words">
      <div
        className={cx(
          "group flex items-center gap-3 rounded-[18px] border px-4 transition-[border-color,box-shadow] focus-within:shadow-[0_0_0_4px_rgb(255_194_26/0.35)]",
          dark ? "border-white/10 bg-white/[0.06] focus-within:border-signal" : "border-slate-200 bg-slate-50 focus-within:border-ink focus-within:bg-white",
        )}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cx("shrink-0", dark ? "text-signal" : "text-ink")}>
          <path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          maxLength={200}
          placeholder="Ask in your own words: a route, a train, a PNR, a flight…"
          aria-label="Ask in your own words"
          className={cx("h-14 min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:font-normal", dark ? "text-white placeholder:text-white/40" : "text-ink placeholder:text-slate-400")}
        />
        <button
          type="submit"
          disabled={busy || q.trim().length < 3}
          className={cx(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold transition-all disabled:opacity-40",
            dark ? "bg-signal text-ink hover:brightness-105" : "bg-ink text-white hover:bg-signal hover:text-ink",
          )}
        >
          {busy ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <ArrowRightIcon width={16} height={16} />}
          <span className="hidden sm:inline">{busy ? "Working…" : "Go"}</span>
        </button>
      </div>
      {note && (
        <p role="status" className={cx("animate-fade-up px-1 text-[13px] font-medium", note.kind === "err" ? "text-red-600" : dark ? "text-signal" : "text-brand-700")}>
          {note.kind === "ok" ? `Opening ${note.text}…` : note.text}
        </p>
      )}
    </form>
  );
}
