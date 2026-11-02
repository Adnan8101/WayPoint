"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Autocomplete, suggestAirports, suggestStations, suggestStationsOrPlace, suggestTrains } from "./autocomplete";
import { Button, Field, SelectField } from "./ui";
import { DateField } from "./date-field";
import { ScanTicket } from "@/features/assistant/scan-ticket";
import { SearchIcon, SeatIcon, SwapIcon } from "./icons";
import { isValidDate, normalizeAirportCode, normalizeFlightNumber, normalizePnr, normalizeStationCode } from "@/lib/validation";
import { todayIST, todayLocal } from "@/lib/dates";

/** Pull a 5-digit train number out of "12951", "12951 Mumbai Rajdhani", etc. */
export function extractTrainNumber(v: string): string | null {
  const m = v.match(/\b(\d{5})\b/);
  return m ? m[1] : null;
}

/** Resolve free text (a code or a name) to a code via the same live search as the suggestions */
async function resolveCode(v: string, normalize: (s: string) => string | null, search: (q: string) => Promise<{ value: string }[]>): Promise<string | null> {
  const text = v.trim();
  if (!text) return null;
  const code = normalize(text);
  const hits = await search(text).catch(() => []);
  if (code && hits.some((h) => h.value === code)) return code;
  return hits[0]?.value ?? code;
}
const resolveStation = (v: string) => resolveCode(v, normalizeStationCode, suggestStations);
const resolveAirport = (v: string) => resolveCode(v, normalizeAirportCode, suggestAirports);

/** A picked or typed station code stays a code; any other text is a place the server expands (e.g. a city) */
function placeOrCode(v: string): string | null {
  const text = v.trim();
  if (text.length < 2) return null;
  return /^[A-Z]{1,5}$/.test(text) ? text : text.slice(0, 60);
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
    if (!n) return setError("Enter a flight number: the airline code followed by digits.");
    if (!isValidDate(date)) return setError("Choose a valid date.");
    setError(undefined);
    go(`${target}?flight=${n}&date=${date}`);
  };

  return (
    <form onSubmit={submit} className={gridForm} noValidate>
      <Field
        id="flight-number" label="Flight number" value={number} placeholder="Flight number" autoCapitalize="characters"
        onChange={(e) => setNumber(e.target.value)} error={error} hint="Airline code + number" maxLength={10}
      />
      <DateField id="flight-date" label="Travel date" value={date} onChange={setDate} min={todayLocal(-1)} max={todayLocal(1)} hint="Live data: yesterday to tomorrow" />
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const f = await resolveAirport(from);
    const t = await resolveAirport(to);
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
      <DateField id="fs-date" label="Departure" value={date} onChange={setDate} min={todayLocal(-1)} max={todayLocal(1)} error={errors.date} />
      <DateField id="fs-return" label="Return (optional)" value={ret} onChange={setRet} min={date} max={todayLocal(1)} error={errors.return} optional rangeStart={date} placeholder="One way" />
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
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const code = await resolveAirport(q);
    if (!code) return setError("No airport matches that name, code, city or country.");
    setError(undefined);
    go(`/airports/${code}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
      <Autocomplete
        id="airport-q" label="Airport name, code, city or country" value={q} onChange={setQ} error={error}
        suggest={suggestAirports} onSelect={(s) => go(`/airports/${s.value}`)} placeholder="Airport name, city or code"
        hint="3-letter IATA and 4-letter ICAO codes both work"
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
      <div className="sm:col-span-2">
        <ScanTicket onPnr={(p) => { setPnr(p); setError(undefined); }} />
      </div>
    </form>
  );
}

export function TrainStatusForm({ initial }: { initial?: { train?: string; date?: string } }) {
  const [train, setTrain] = useState(initial?.train ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIST());
  const [error, setError] = useState<string>();
  const { busy, go } = useBusyNav();
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
        placeholder="Train number or name" error={error} />
      <DateField id="ts-date" label="Journey start date" value={date} onChange={setDate} min={todayIST(-4)} max={todayIST()} hint="The day the train left its first station" />
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
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const f = placeOrCode(from);
    const t = placeOrCode(to);
    const errs: Record<string, string> = {};
    if (!f) errs.from = "Enter a station or a city.";
    if (!t) errs.to = "Enter a station or a city.";
    if (f && t && f === t) errs.to = "From and To must be different.";
    if (!isValidDate(date)) errs.date = "Choose a valid date.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    go(`/trains-between-stations?${new URLSearchParams({ from: f!, to: t!, date })}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_200px_auto]">
      <Autocomplete id="tb-from" label="From" value={from} onChange={setFrom} suggest={suggestStationsOrPlace} placeholder="City, station or code" error={errors.from} />
      <button type="button" onClick={() => { setFrom(to); setTo(from); }} aria-label="Swap stations"
        className="group hidden size-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[var(--shadow-card)] transition-all duration-500 ease-[var(--ease-spring)] hover:rotate-180 hover:border-ink hover:bg-ink hover:text-signal lg:mt-[26px] lg:flex">
        <SwapIcon width={18} height={18} />
      </button>
      <Autocomplete id="tb-to" label="To" value={to} onChange={setTo} suggest={suggestStationsOrPlace} placeholder="City, station or code" error={errors.to} />
      <DateField id="tb-date" label="Journey date" value={date} onChange={setDate} min={todayIST()} max={todayIST(120)} error={errors.date} />
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
        placeholder="Train number or name" error={error} />
      <Button type="submit" loading={busy} className="h-12 sm:mt-[26px]"><SearchIcon width={16} height={16} /> {cta}</Button>
    </form>
  );
}

export const CLASS_OPTIONS = [
  { value: "SL", label: "Sleeper (SL)" },
  { value: "3E", label: "AC 3 Economy (3E)" },
  { value: "3A", label: "AC 3 Tier (3A)" },
  { value: "2A", label: "AC 2 Tier (2A)" },
  { value: "1A", label: "AC First Class (1A)" },
  { value: "CC", label: "AC Chair Car (CC)" },
  { value: "EC", label: "Executive Chair (EC)" },
];
export const QUOTA_OPTIONS = [
  { value: "GN", label: "General" },
  { value: "TQ", label: "Tatkal" },
  { value: "PT", label: "Premium Tatkal" },
  { value: "LD", label: "Ladies" },
];

export function SeatsForm({ initial }: { initial?: Record<string, string | undefined> }) {
  const [train, setTrain] = useState(initial?.train ?? "");
  const [from, setFrom] = useState(initial?.from ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIST(1));
  const [cls, setCls] = useState(initial?.class ?? "3A");
  const [quota, setQuota] = useState(initial?.quota ?? "GN");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, go } = useBusyNav();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = extractTrainNumber(train);
    const f = await resolveStation(from);
    const t = await resolveStation(to);
    const errs: Record<string, string> = {};
    if (!n) errs.train = "Enter a 5-digit train number, or pick one from the suggestions.";
    if (!f) errs.from = "Choose a station on the train's route.";
    if (!t) errs.to = "Choose a station on the train's route.";
    if (f && t && f === t) errs.to = "From and To must be different.";
    if (!isValidDate(date)) errs.date = "Choose a valid date.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    go(`/seat-availability?${new URLSearchParams({ train: n!, from: f!, to: t!, date, class: cls, quota })}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <Autocomplete id="sa-train" label="Train number or name" value={train} onChange={setTrain} suggest={suggestTrains} minChars={2} placeholder="Train number or name" error={errors.train} className="sm:col-span-2" />
      <Autocomplete id="sa-from" label="From station" value={from} onChange={setFrom} suggest={suggestStations} placeholder="Station name or code" error={errors.from} className="lg:col-span-2" />
      <Autocomplete id="sa-to" label="To station" value={to} onChange={setTo} suggest={suggestStations} placeholder="Station name or code" error={errors.to} className="lg:col-span-2" />
      <DateField id="sa-date" label="Journey date" value={date} onChange={setDate} min={todayIST()} max={todayIST(120)} error={errors.date} className="lg:col-span-2" />
      <SelectField id="sa-class" label="Class" value={cls} onChange={setCls} options={CLASS_OPTIONS} />
      <SelectField id="sa-quota" label="Quota" value={quota} onChange={setQuota} options={QUOTA_OPTIONS} />
      <Button type="submit" loading={busy} className="h-12 sm:col-span-2 lg:mt-[26px]"><SeatIcon width={17} height={17} /> Check seats & fare</Button>
    </form>
  );
}

export function VacancyForm({ initial }: { initial?: Record<string, string | undefined> }) {
  const [train, setTrain] = useState(initial?.train ?? "");
  const [boarding, setBoarding] = useState(initial?.boarding ?? "");
  const [date, setDate] = useState(initial?.date ?? todayIST());
  const [cls, setCls] = useState(initial?.class ?? "ALL");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, go } = useBusyNav();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = extractTrainNumber(train);
    const b = await resolveStation(boarding);
    const errs: Record<string, string> = {};
    if (!n) errs.train = "Enter a 5-digit train number, or pick one from the suggestions.";
    if (!b) errs.boarding = "Choose the station where you board.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    go(`/chart-vacancy?${new URLSearchParams({ train: n!, boarding: b!, date, class: cls })}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_1fr_0.9fr_auto]">
      <Autocomplete id="cv-train" label="Train number or name" value={train} onChange={setTrain} suggest={suggestTrains} minChars={2} placeholder="Train number or name" error={errors.train} />
      <Autocomplete id="cv-board" label="Boarding station" value={boarding} onChange={setBoarding} suggest={suggestStations} placeholder="Station name or code" error={errors.boarding} />
      <DateField id="cv-date" label="Boarding date" value={date} onChange={setDate} min={todayIST(-1)} max={todayIST(1)} />
      <SelectField id="cv-class" label="Class" value={cls} onChange={setCls} options={[{ value: "ALL", label: "All classes" }, ...CLASS_OPTIONS.filter((c) => ["1A", "2A", "3A", "3E", "SL"].includes(c.value))]} />
      <Button type="submit" loading={busy} className="h-12 sm:col-span-2 lg:col-span-1 lg:mt-[26px]"><SeatIcon width={17} height={17} /> Find berths</Button>
    </form>
  );
}

export function StationSearchForm() {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string>();
  const { busy, go } = useBusyNav();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const code = await resolveStation(q);
    if (!code) return setError("No station matches that name, code or city.");
    setError(undefined);
    go(`/railway-stations/${code}`);
  };
  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
      <Autocomplete id="station-q" label="Station name, code or city" value={q} onChange={setQ} error={error} suggest={suggestStations}
        onSelect={(s) => go(`/railway-stations/${s.value}`)} placeholder="Station name or code" />
      <Button type="submit" loading={busy} className="h-12 sm:mt-[26px]"><SearchIcon width={16} height={16} /> Find station</Button>
    </form>
  );
}
