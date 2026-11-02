"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Autocomplete, suggestAirports, suggestStations, suggestTrains } from "./autocomplete";
import { Button, Field, SelectField } from "./ui";
import { SearchIcon, SwapIcon } from "./icons";
import { isValidDate, normalizeAirportCode, normalizeFlightNumber, normalizePnr, normalizeStationCode } from "@/lib/validation";
import { todayIST, todayLocal } from "@/lib/dates";
import { findAirport, searchAirports } from "@/lib/data/airports";
import { findStation, searchStations } from "@/lib/data/stations";
import { fmtDate } from "@/lib/format";

/** Pull a 5-digit train number out of "12951", "12951 Mumbai Rajdhani", etc. */
export function extractTrainNumber(v: string): string | null {
  const m = v.match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

/** Resolve free text like "NDLS", "New Delhi" or "Mumbai" into a station code */
function resolveStation(v: string): string | null {
  const code = normalizeStationCode(v);
  if (code && findStation(code)) return code;
  // Prefer a name match ("Delhi" → NDLS); otherwise accept any well-formed code not in our list
  return searchStations(v, 1)[0]?.code ?? code;
}

function resolveAirport(v: string): string | null {
  const code = normalizeAirportCode(v);
  if (code && findAirport(code)) return code;
  return searchAirports(v, 1)[0]?.iata ?? code;
}

function useBusyNav() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    go: (href: string) => {
      setBusy(true);
      router.push(href, { scroll: false });
      setTimeout(() => setBusy(false), 600);
    },
  };
}

const gridForm = "grid gap-4 sm:grid-cols-[1fr_auto] lg:grid-cols-[2fr_1fr_auto] items-start";

// ---------- Flights ----------

export function FlightStatusForm({ target = "/flight-status", initial }: { target?: string; initial?: { number?: string; date?: string } }) {
  const [number, setNumber] = useState(initial?.number ?? "");
  const [date, setDate] = useState(initial?.date ?? todayLocal());
  const [error, setError] = useState<string>();
  const { busy, go } = useBusyNav();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = normalizeFlightNumber(number);
    if (!n) return setError("Enter a flight number like AI101, 6E2134 or EK512.");
    if (!isValidDate(date)) return setError("Choose a valid date.");
    setError(undefined);
    go(`${target}?flight=${n}&date=${date}`);
  };

  return (
    <form onSubmit={submit} className={gridForm} noValidate>
      <Field
        id="flight-number" label="Flight number" value={number} placeholder="e.g. AI101" autoCapitalize="characters"
        onChange={(e) => setNumber(e.target.value)} error={error} hint="Airline code + number" maxLength={10}
      />
      <Field id="flight-date" label="Travel date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayLocal(-1)} max={todayLocal(1)} hint="Live data: yesterday to tomorrow" />
      <Button type="submit" loading={busy} className="h-12 sm:col-span-2 lg:col-span-1 lg:mt-[26px]"><SearchIcon width={16} height={16} /> {target === "/flight-tracker" ? "Track flight" : "Check flight status"}</Button>
    </form>
  );
}

export function FlightSearchForm({ initial }: { initial?: Record<string, string> }) {
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [date, setDate] = useState(initial?.date ?? todayLocal());
  const [ret, setRet] = useState(initial?.return ?? "");
  const [pax, setPax] = useState(initial?.pax ?? "1");
  const [cls, setCls] = useState(initial?.class ?? "economy");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, go } = useBusyNav();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const f = resolveAirport(from);
    const t = resolveAirport(to);
    const errs: Record<string, string> = {};
    if (!f) errs.from = "Choose a departure airport.";
    if (!t) errs.to = "Choose an arrival airport.";
    if (f && t && f === t) errs.to = "Arrival must differ from departure.";
    if (!isValidDate(date)) errs.date = "Choose a valid date.";
    if (ret && (!isValidDate(ret) || ret < date)) errs.return = "Return must be on or after departure.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const p = new URLSearchParams({ from: f!, to: t!, date, pax, class: cls });
    if (ret) p.set("return", ret);
    go(`/flight-search?${p}`);
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <Autocomplete id="fs-from" label="From" value={from} onChange={setFrom} suggest={suggestAirports} placeholder="City or airport code" error={errors.from} className="lg:col-span-2" />
      <Autocomplete id="fs-to" label="To" value={to} onChange={setTo} suggest={suggestAirports} placeholder="City or airport code" error={errors.to} className="lg:col-span-2" />
      <Field id="fs-date" label="Departure" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayLocal(-1)} max={todayLocal(1)} error={errors.date} />
      <Field id="fs-return" label="Return (optional)" type="date" value={ret} onChange={(e) => setRet(e.target.value)} min={date} max={todayLocal(1)} error={errors.return} />
      <SelectField id="fs-pax" label="Passengers" value={pax} onChange={setPax} options={Array.from({ length: 9 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} ${i ? "passengers" : "passenger"}` }))} className="lg:col-span-2" />
      <SelectField id="fs-class" label="Travel class" value={cls} onChange={setCls} className="lg:col-span-2"
        options={[{ value: "economy", label: "Economy" }, { value: "premium", label: "Premium Economy" }, { value: "business", label: "Business" }, { value: "first", label: "First" }]} />
      <div className="flex items-end lg:col-span-2">
        <Button type="submit" loading={busy} className="h-12 w-full"><SearchIcon width={16} height={16} /> Search flights</Button>
      </div>
    </form>
  );
}

export function AirportSearchForm() {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string>();
  const { busy, go } = useBusyNav();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = resolveAirport(q);
    if (!code) return setError("No airport matches that name, code, city or country.");
    setError(undefined);
    go(`/airports/${code}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
      <Autocomplete
        id="airport-q" label="Airport name, code, city or country" value={q} onChange={setQ} error={error}
        suggest={suggestAirports} onSelect={(s) => go(`/airports/${s.value}`)} placeholder="e.g. DEL, Heathrow, Dubai, Singapore"
        hint="IATA (DEL) and ICAO (VIDP) codes both work"
      />
      <Button type="submit" loading={busy} className="h-12 sm:mt-[26px]"><SearchIcon width={16} height={16} /> Find airport</Button>
    </form>
  );
}

// ---------- Trains ----------

export function PnrForm({ initial, onSubmitPnr, busy: externalBusy }: { initial?: string; onSubmitPnr?: (pnr: string) => void; busy?: boolean }) {
  const [pnr, setPnr] = useState(initial ?? "");
  const [error, setError] = useState<string>();
  const { busy, go } = useBusyNav();
  const digits = pnr.replace(/\D/g, "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = normalizePnr(pnr);
    if (!p) return setError(digits.length ? `A PNR has exactly 10 digits. You entered ${digits.length}.` : "Enter your 10-digit PNR number.");
    setError(undefined);
    // The PNR goes in the URL fragment, which browsers never send to servers.
    if (onSubmitPnr) onSubmitPnr(p);
    else go(`/pnr-status#pnr=${p}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
      <Field
        id="pnr" label="PNR number" value={pnr} inputMode="numeric" autoComplete="off" placeholder="Enter your 10-digit PNR" maxLength={12}
        onChange={(e) => setPnr(e.target.value.replace(/[^\d\s-]/g, ""))} error={error}
        hint={`${digits.length} of 10 digits entered. You'll find your PNR at the top left of your ticket.`}
      />
      <Button type="submit" loading={busy || externalBusy} className="h-12 sm:mt-[26px]"><SearchIcon width={16} height={16} /> Check PNR status</Button>
    </form>
  );
}

export function TrainStatusForm({ initial }: { initial?: { train?: string; date?: string } }) {
  const [train, setTrain] = useState(initial?.train ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIST());
  const [error, setError] = useState<string>();
  const { busy, go } = useBusyNav();
  const days = [0, 1, 2, 3, 4].map((d) => todayIST(-d));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = extractTrainNumber(train);
    if (!n) return setError("Enter a 5-digit train number, or pick a train from the suggestions.");
    setError(undefined);
    go(`/train-status?train=${n}&date=${date}`);
  };
  return (
    <form onSubmit={submit} noValidate className={gridForm}>
      <Autocomplete id="ts-train" label="Train number or name" value={train} onChange={setTrain} suggest={suggestTrains} minChars={2}
        placeholder="e.g. 12951 or Rajdhani" error={error} />
      <SelectField id="ts-date" label="Journey start date" value={date} onChange={setDate}
        options={days.map((d, i) => ({ value: d, label: `${["Today", "Yesterday", "2 days ago", "3 days ago", "4 days ago"][i]} · ${fmtDate(d, { day: "numeric", month: "short" })}` }))} />
      <Button type="submit" loading={busy} className="h-12 sm:col-span-2 lg:col-span-1 lg:mt-[26px]"><SearchIcon width={16} height={16} /> Track my train</Button>
    </form>
  );
}

export function TrainsBetweenForm({ initial }: { initial?: { from?: string; to?: string; date?: string } }) {
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIST());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, go } = useBusyNav();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const f = resolveStation(from);
    const t = resolveStation(to);
    const errs: Record<string, string> = {};
    if (!f) errs.from = "Choose a valid station name or code.";
    if (!t) errs.to = "Choose a valid station name or code.";
    if (f && t && f === t) errs.to = "From and To must be different.";
    if (!isValidDate(date)) errs.date = "Choose a valid date.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    go(`/trains-between-stations?from=${f}&to=${t}&date=${date}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_200px_auto]">
      <Autocomplete id="tb-from" label="From station" value={from} onChange={setFrom} suggest={suggestStations} placeholder="Name or code, e.g. NDLS" error={errors.from} />
      <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap stations"
        className="hidden h-12 items-center justify-center rounded-xl lg:mt-[26px] border border-slate-300 px-3 text-slate-600 hover:bg-slate-50 lg:flex">
        <SwapIcon width={18} height={18} />
      </button>
      <Autocomplete id="tb-to" label="To station" value={to} onChange={setTo} suggest={suggestStations} placeholder="Name or code, e.g. CSMT" error={errors.to} />
      <Field id="tb-date" label="Journey date" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={todayIST()} max={todayIST(120)} error={errors.date} />
      <Button type="submit" loading={busy} className="h-12 sm:mt-[26px]"><SearchIcon width={16} height={16} /> Find trains</Button>
    </form>
  );
}

export function TrainNumberForm({ target, initial, cta }: { target: "/train-schedule" | "/train-route"; initial?: string; cta: string }) {
  const [train, setTrain] = useState(initial ?? "");
  const [error, setError] = useState<string>();
  const { busy, go } = useBusyNav();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = extractTrainNumber(train);
    if (!n) return setError("Enter a 5-digit train number, or pick a train from the suggestions.");
    setError(undefined);
    go(`${target}?train=${n}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
      <Autocomplete id={`${target}-train`} label="Train number or name" value={train} onChange={setTrain} suggest={suggestTrains} minChars={2}
        placeholder="e.g. 12002 or Shatabdi" error={error} />
      <Button type="submit" loading={busy} className="h-12 sm:mt-[26px]"><SearchIcon width={16} height={16} /> {cta}</Button>
    </form>
  );
}

export function StationSearchForm() {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string>();
  const { busy, go } = useBusyNav();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = resolveStation(q);
    if (!code) return setError("No station matches that name, code or city.");
    setError(undefined);
    go(`/railway-stations/${code}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
      <Autocomplete id="station-q" label="Station name, code or city" value={q} onChange={setQ} error={error} suggest={suggestStations}
        onSelect={(s) => go(`/railway-stations/${s.value}`)} placeholder="e.g. NDLS, Howrah, Bengaluru" />
      <Button type="submit" loading={busy} className="h-12 sm:mt-[26px]"><SearchIcon width={16} height={16} /> Find station</Button>
    </form>
  );
}
