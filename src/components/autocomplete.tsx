"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { FieldLabel, inputClass } from "./ui";
import { searchAirports } from "@/lib/data/airports";
import { POPULAR_TRAINS, searchStations } from "@/lib/data/stations";
import { getJson } from "@/lib/client/use-api";
import type { TrainSuggestion } from "@/lib/types";

export interface Suggestion {
  /** Value placed in the input when selected */
  value: string;
  primary: string;
  secondary?: string;
  badge?: string;
}

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect?: (s: Suggestion) => void;
  suggest: (q: string) => Suggestion[] | Promise<Suggestion[]>;
  placeholder?: string;
  hint?: string;
  error?: string;
  inputMode?: "text" | "numeric";
  className?: string;
  minChars?: number;
}

export function Autocomplete({ id, label, value, onChange, onSelect, suggest, placeholder, hint, error, inputMode, className, minChars = 1 }: Props) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const seq = useRef(0);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) return;
    const q = value.trim();
    if (q.length < minChars) {
      setItems([]);
      return;
    }
    const n = ++seq.current;
    const t = setTimeout(async () => {
      const res = await suggest(q);
      if (n === seq.current) {
        setItems(res);
        setActive(-1);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [value, suggest, minChars]);

  const choose = (s: Suggestion) => {
    onChange(s.value);
    onSelect?.(s);
    setOpen(false);
  };

  return (
    <div className={cx("relative flex flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          focused.current = true;
          setOpen(true);
        }}
        onBlur={() => {
          focused.current = false;
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            choose(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={inputClass(!!error)}
      />
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="absolute top-full z-30 mt-1.5 max-h-80 w-full min-w-[260px] overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[var(--shadow-pop)]">
          {items.map((s, i) => (
            <li
              key={s.value + i}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              className={cx("flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm", i === active ? "bg-brand-50" : "hover:bg-slate-50")}
            >
              {s.badge && <span className="min-w-12 shrink-0 rounded-md bg-ink px-1.5 py-1 text-center font-mono text-[12px] font-medium text-white">{s.badge}</span>}
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{s.primary}</span>
                {s.secondary && <span className="block truncate text-xs text-slate-500">{s.secondary}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {error ? <p className="text-[13px] text-red-600" role="alert">{error}</p> : hint ? <p className="text-[12.5px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

// ---- Ready-made suggestion sources ----

export const suggestStations = (q: string): Suggestion[] =>
  searchStations(q).map((s) => ({ value: s.code, primary: s.name, secondary: `${s.city}, ${s.state}`, badge: s.code }));

export const suggestAirports = (q: string): Suggestion[] =>
  searchAirports(q).map((a) => ({ value: a.iata, primary: a.name, secondary: `${a.city}, ${a.country} · ${a.icao}`, badge: a.iata }));

export async function suggestTrains(q: string): Promise<Suggestion[]> {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const local = POPULAR_TRAINS.filter((t) => t.number.startsWith(s) || t.name.toLowerCase().includes(s));
  const remote = (await getJson<TrainSuggestion[]>(`/api/trains/search?q=${encodeURIComponent(s)}`)) ?? [];
  const seen = new Set<string>();
  return [...local, ...remote]
    .filter((t) => (seen.has(t.number) ? false : (seen.add(t.number), true)))
    .slice(0, 8)
    .map((t) => ({ value: t.number, primary: t.name, badge: t.number }));
}
