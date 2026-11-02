"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/format";
import { FieldLabel, inputClass } from "./ui";
import { Portal, useAnchoredStyle } from "./floating";
import { getJson } from "@/lib/client/use-api";
import type { Airport, StationSuggestion, TrainSuggestion } from "@/lib/types";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const showList = open && items.length > 0;
  const anchored = useAnchoredStyle(showList, inputRef, listRef, { matchWidth: true, minWidth: 280 });

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
        ref={inputRef}
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
      {showList && (
        <Portal>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          style={{ ...anchored, maxHeight: Math.min(320, Number(anchored.maxHeight ?? 320)) }}
          className="animate-pop-in z-[70] overflow-auto overscroll-contain rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[var(--shadow-pop)]"
        >
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
              className={cx("group flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-colors", i === active ? "bg-signal-soft" : "hover:bg-slate-100")}
            >
              {s.badge && (
                <span className={cx("min-w-14 shrink-0 rounded-lg px-1.5 py-1.5 text-center font-mono text-[12px] font-bold transition-colors", i === active ? "bg-ink text-signal" : "bg-slate-100 text-ink group-hover:bg-ink group-hover:text-signal")}>
                  {s.badge}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{s.primary}</span>
                {s.secondary && <span className="block truncate text-xs text-slate-500">{s.secondary}</span>}
              </span>
            </li>
          ))}
        </ul>
        </Portal>
      )}
      {error ? <p className="animate-fade-up text-[13px] font-medium text-red-600" role="alert">{error}</p> : hint ? <p className="text-[12.5px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

// ---- Ready-made suggestion sources ----

// All live: stations from irctc.dev, airports from OurAirports, trains from irctc.dev

export async function suggestStations(q: string): Promise<Suggestion[]> {
  const s = q.trim();
  if (s.length < 2) return [];
  const list = (await getJson<StationSuggestion[]>(`/api/stations/search?q=${encodeURIComponent(s)}`)) ?? [];
  return list.slice(0, 8).map((st) => ({ value: st.code, primary: st.name, secondary: st.state || undefined, badge: st.code }));
}

export async function suggestAirports(q: string): Promise<Suggestion[]> {
  const s = q.trim();
  if (s.length < 2) return [];
  const list = (await getJson<Airport[]>(`/api/airports/search?q=${encodeURIComponent(s)}`)) ?? [];
  return list.map((a) => ({ value: a.iata, primary: a.name, secondary: [a.city, a.country].filter(Boolean).join(", ") + (a.icao ? ` · ${a.icao}` : ""), badge: a.iata }));
}

export async function suggestTrains(q: string): Promise<Suggestion[]> {
  const s = q.trim();
  if (s.length < 2) return [];
  const list = (await getJson<TrainSuggestion[]>(`/api/trains/search?q=${encodeURIComponent(s)}`)) ?? [];
  return list.slice(0, 8).map((t) => ({ value: t.number, primary: t.name, badge: t.number }));
}
