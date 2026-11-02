import "server-only";
import type {
  AvailabilityType,
  CancelledTrains,
  ChartVacancy,
  PnrPassenger,
  PnrStatus,
  RunningStation,
  ScheduleStop,
  SeatAvailability,
  StationBoard,
  Station,
  StationBoardTrain,
  StationSuggestion,
  StationTimetable,
  TrainBetween,
  TrainFare,
  TrainRunningStatus,
  TrainSchedule,
  TrainSuggestion,
} from "@/lib/types";
import { ApiError } from "../errors";
import { cached } from "../cache";
import { fetchJson } from "../http";
import { arr, bool, get, hhmm, num, obj, str } from "../pick";

// Indian Railways data via irctc.dev (https://irctc.dev): PNR, live running
// status, station boards, timetables, seat availability, fares, post-chart
// vacant berths and cancellations. Every call is a GET with an x-api-key header.

export const railSource = "irctc.dev";
export const pnrSource = railSource;

function config() {
  const key = process.env.IRCTC_DEV_API_KEY;
  if (!key) throw new ApiError("NOT_CONFIGURED", "Railway information is not available right now (railway data provider not configured).");
  return { key, base: process.env.IRCTC_DEV_BASE_URL || "https://api.irctc.dev" };
}

/** GET a path, mapping provider failures to our error codes. Returns the whole body. */
async function call(path: string, notFound: ApiError): Promise<unknown> {
  const { key, base } = config();
  const raw = await fetchJson(`${base}${path}`, {
    headers: { "x-api-key": key },
    timeoutMs: 15_000,
    onStatus: (status) => {
      if (status === 400 || status === 404) throw notFound;
      if (status === 503) throw new ApiError("UNAVAILABLE", "Indian Railways' systems are under maintenance. Please try again shortly.");
    },
  });
  if (get(raw, "success") === false) {
    const why = `${str(raw, "code") ?? ""} ${str(raw, "error", "message") ?? ""}`;
    if (/not\s*found|invalid|no valid|does not run|BAD_REQUEST|flushed/i.test(why)) throw notFound;
    throw new ApiError("UNAVAILABLE", "The railway data provider could not return this information right now.");
  }
  return raw;
}

// ---------- helpers ----------

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function runDays(v: unknown): string[] {
  const set = new Set(arr(v).map((d) => String(d).slice(0, 3).toLowerCase()));
  return DAY_NAMES.filter((d) => set.has(d.toLowerCase()));
}

/** "HOWRAH JN" → "Howrah Jn"; leaves mixed-case names alone */
function titleCase(s: string | undefined): string {
  if (!s) return "";
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").replace(/(junction|jn|central|cantt|terminus|jct)$/, "");

/** "YYYY-MM-DD" → "DD-MM-YYYY" */
const dmy = (iso: string) => iso.split("-").reverse().join("-");

/** "01 Nov 2026 00:05," (IST) → ISO string */
function parseIstStamp(v: string | undefined): string | undefined {
  const m = v?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2})/);
  if (!m) return undefined;
  const mon = DAY_MONTHS.indexOf(m[2].toLowerCase());
  if (mon < 0) return undefined;
  return new Date(`${m[3]}-${String(mon + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}T${m[4]}:${m[5]}:00+05:30`).toISOString();
}
const DAY_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// ---------- PNR ----------

const CODES = ["CNF", "RAC", "GNWL", "RLWL", "PQWL", "TQWL", "RSWL", "WL", "CAN"] as const;
type Code = PnrPassenger["currentStatusCode"];

function statusCode(s: string): Code {
  const up = s.toUpperCase();
  for (const c of CODES) if (new RegExp(`(^|[^A-Z])${c}([^A-Z]|$)`).test(up)) return c;
  if (/CONFIRM/.test(up)) return "CNF";
  if (/CANCEL/.test(up)) return "CAN";
  return "OTHER";
}

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };

/** "Nov 23, 2026 10:05:00 AM" → "2026-11-23" (no time-zone conversion) */
function isoDate(v: string | undefined): string {
  if (!v) return "";
  const m = v.match(/([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${MONTHS[m[1].toLowerCase()]}-${m[2].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v;
}

export async function getPnrStatus(pnr: string): Promise<PnrStatus> {
  const notFound = new ApiError("INVALID_PNR", "This PNR was not found. It may be invalid, or the journey may be completed and the PNR flushed.");
  const d = get(await call(`/api/v1/pnr/${pnr}`, notFound), "data");
  if (!d) throw notFound;

  // The provider returns the current status only (no separate booking status).
  const passengers: PnrPassenger[] = arr(get(d, "passengers")).map((p, i) => {
    const current = str(p, "raw", "status") ?? "Unknown";
    return {
      number: num(p, "number") ?? i + 1,
      bookingStatus: "",
      bookingStatusCode: "OTHER",
      currentStatus: current,
      currentStatusCode: statusCode(str(p, "status") ?? current),
      coach: str(p, "coach"),
      berth: str(p, "seat"),
      berthType: str(p, "berth"),
    };
  });

  const fromCode = str(d, "from.code") ?? "";
  const toCode = str(d, "to.code") ?? "";
  const chart = str(d, "chartStatus") ?? "";
  // Station names come from the train's own timetable
  const trainNo = str(d, "trainNumber") ?? "";
  const stops = /^\d{5}$/.test(trainNo) ? ((await scheduleCached(trainNo).catch(() => undefined))?.stops ?? []) : [];
  const nameOf = (code: string) => stops.find((s) => s.code === code)?.name;
  return {
    pnr,
    trainNumber: str(d, "trainNumber") ?? "",
    trainName: str(d, "trainName") ?? "",
    journeyDate: isoDate(str(d, "journeyDate", "from.time")),
    boarding: { code: fromCode, name: nameOf(fromCode) },
    destination: { code: toCode, name: nameOf(toCode) },
    from: { code: fromCode, name: nameOf(fromCode) },
    travelClass: str(d, "class") ?? "",
    quota: str(d, "quota") ?? "",
    chartPrepared: /prepared/i.test(chart) && !/not\s+prepared/i.test(chart),
    passengers,
  };
}

// ---------- Schedule ----------

export async function getSchedule(trainNo: string): Promise<TrainSchedule> {
  const notFound = new ApiError("INVALID_TRAIN", `No schedule was found for train ${trainNo}.`);
  const d = get(await call(`/api/v1/trains/${trainNo}`, notFound), "data");
  const stations = arr(get(d, "stations"));
  if (!stations.length) throw notFound;

  const stops: ScheduleStop[] = stations.map((s, i) => ({
    seq: num(s, "seq") ?? i + 1,
    code: str(s, "code") ?? "",
    name: titleCase(str(s, "name")),
    arrival: hhmm(get(s, "arrival")),
    departure: hhmm(get(s, "departure")),
    haltMinutes: num(s, "haltMinutes") || undefined,
    day: (num(s, "arrivalDayOffset", "dayOffset") ?? 0) + 1,
    distanceKm: num(s, "distanceKm"),
    isStop: true,
    lat: num(s, "lat"),
    lon: num(s, "lng", "lon"),
  }));

  const first = stations[0];
  const last = stations[stations.length - 1];
  const start = num(first, "departureMin");
  const end = num(last, "arrivalMin");
  const total = start !== undefined && end !== undefined ? (num(last, "dayOffset") ?? 0) * 1440 + end - start : undefined;
  return {
    trainNumber: str(d, "trainNo") ?? trainNo,
    trainName: titleCase(str(d, "trainName")),
    trainType: str(d, "trainType"),
    source: { code: stops[0].code, name: stops[0].name },
    destination: { code: stops.at(-1)!.code, name: stops.at(-1)!.name },
    runDays: runDays(get(d, "runningDays")),
    totalDurationMinutes: total && total > 0 ? total : undefined,
    totalDistanceKm: num(d, "totalDistance") ?? stops.at(-1)!.distanceKm,
    stops,
  };
}

/** Timetables rarely change; live status reuses this to recover station codes */
const scheduleCached = (trainNo: string) => cached(`irctc:schedule:${trainNo}`, 7 * 24 * 60 * 60_000, () => getSchedule(trainNo)).then((r) => r.value);

// ---------- Live running status ----------

export async function getLiveStatus(trainNo: string, date: string): Promise<TrainRunningStatus> {
  const notFound = new ApiError("INVALID_TRAIN", `No running information was found for train ${trainNo} on the selected date.`);
  const [raw, schedule] = await Promise.all([call(`/api/v1/live/${trainNo}?date=${date}`, notFound), scheduleCached(trainNo).catch(() => undefined)]);
  const d = get(raw, "data");
  const live = arr(get(d, "stops"));
  if (!d || !live.length) throw notFound;

  // The live feed names stations but omits codes: match them to the timetable in order
  const sched = schedule?.stops ?? [];
  let cursor = 0;
  const matchStop = (name: string, i: number): ScheduleStop | undefined => {
    if (sched.length === live.length) return sched[i];
    const n = normName(name);
    for (let j = cursor; j < sched.length; j++) {
      if (normName(sched[j].name) === n) {
        cursor = j + 1;
        return sched[j];
      }
    }
    return undefined;
  };

  const stations: RunningStation[] = live.map((s, i) => {
    const name = str(s, "stationName") ?? "";
    const ref = matchStop(name, i);
    const raw = (str(s, "status") ?? "").toLowerCase();
    const state: RunningStation["state"] = raw === "passed" ? "passed" : raw === "current" ? "current" : "upcoming";
    const arrives = hhmm(get(s, "arrives"));
    const departs = hhmm(get(s, "departs"));
    return {
      code: ref?.code ?? "",
      name: titleCase(name) || ref?.name || "",
      day: num(s, "day") ?? ref?.day,
      distanceKm: num(s, "distanceKm") ?? ref?.distanceKm,
      scheduledArrival: ref?.arrival,
      scheduledDeparture: ref?.departure,
      // Times at stations already reached are reported actuals; the rest are projections
      actualArrival: arrives ? { value: arrives, kind: state === "upcoming" ? "estimated" : "actual" } : undefined,
      actualDeparture: departs ? { value: departs, kind: state === "passed" ? "actual" : "estimated" } : undefined,
      delayMinutes: num(s, "delayMin"),
      state,
      isStop: true,
    };
  });

  const total = num(d, "totalDistanceKm") ?? stations.at(-1)?.distanceKm;
  const reached = [...stations].reverse().find((s) => s.state !== "upcoming");
  const next = stations.find((s) => s.state === "upcoming");
  const covered = reached?.distanceKm;
  const status = str(d, "locationStatus");
  // Before departure the feed carries the previous run's stamp, which would read as stale data
  const started = Boolean(reached) && !/yet to start/i.test(status ?? "");
  const updated = started ? (parseIstStamp(str(d, "lastUpdated")) ?? str(d, "updatedAt")) : undefined;

  return {
    trainNumber: str(d, "trainNumber") ?? trainNo,
    trainName: titleCase(str(d, "trainName") ?? schedule?.trainName),
    trainType: schedule?.trainType,
    source: schedule?.source ?? { code: stations[0].code, name: stations[0].name },
    destination: schedule?.destination ?? { code: stations.at(-1)!.code, name: stations.at(-1)!.name },
    journeyDate: date,
    statusMessage: status ? status[0].toUpperCase() + status.slice(1) : undefined,
    currentLocation: str(d, "currentLocation"),
    lastReportedStation: reached ? { code: reached.code, name: reached.name, at: updated } : undefined,
    delayMinutes: num(d, "currentDelayMin"),
    nextStation: next ? { code: next.code, name: next.name, eta: next.actualArrival, etd: next.actualDeparture } : undefined,
    totalDistanceKm: total,
    coveredDistanceKm: covered,
    progress: total && covered !== undefined ? Math.min(1, Math.max(0, covered / total)) : undefined,
    stations,
    lastUpdated: updated,
  };
}

// ---------- Trains between stations ----------

export async function getTrainsBetween(from: string, to: string, date: string): Promise<TrainBetween[]> {
  const none = new ApiError("NO_RESULTS", `No trains were found between ${from} and ${to} on ${date}.`);
  const list = arr(get(await call(`/api/v1/trains/search?from=${from}&to=${to}&date=${date}`, none), "data"))
    .map((t) => ({
      trainNumber: str(t, "trainNo") ?? "",
      trainName: titleCase(str(t, "trainName")),
      trainType: str(t, "trainType"),
      from: { code: str(t, "fromStation") ?? from, name: titleCase(str(t, "fromStationName")) || undefined },
      to: { code: str(t, "toStation") ?? to, name: titleCase(str(t, "toStationName")) || undefined },
      source: str(t, "trainSrc") ? { code: str(t, "trainSrc")! } : undefined,
      destination: str(t, "trainDstn") ? { code: str(t, "trainDstn")! } : undefined,
      departure: hhmm(get(t, "departure")) ?? "",
      arrival: hhmm(get(t, "arrival")) ?? "",
      durationMinutes: num(t, "durationMin"),
      intermediateStops: num(t, "halts"),
      runDays: runDays(get(t, "runningDays")),
      classes: arr(get(t, "classes")).map(String),
      arrivalDayOffset: (num(t, "toStationDayOffset") ?? 0) - (num(t, "fromStationDayOffset") ?? 0),
      distanceKm: num(t, "distance"),
      estimatedFare: num(t, "estimatedFare"),
    }))
    .filter((t) => t.trainNumber);
  if (!list.length) throw none;
  return list;
}

// ---------- Live station board ----------

function boardTime(v: unknown) {
  if (typeof v !== "string") return undefined;
  const t = hhmm(v);
  // A trailing * marks a projection; without it the time has happened
  return t ? { value: t, kind: v.includes("*") ? ("estimated" as const) : ("actual" as const) } : undefined;
}

export async function getStationBoard(code: string, hours: number): Promise<StationBoard> {
  const raw = await call(`/api/v1/live/station/${code}?hours=${hours}`, new ApiError("INVALID_STATION", `No live information was found for station ${code}.`));
  const rows = arr(get(raw, "trains")).map((t) => {
    const [src, dst] = (str(t, "route") ?? "").split("-");
    const train: StationBoardTrain & { originates: boolean; terminates: boolean } = {
      trainNumber: str(t, "trainNo") ?? "",
      trainName: titleCase(str(t, "trainName")),
      trainType: str(t, "trainType"),
      source: src || undefined,
      destination: dst || undefined,
      scheduledArrival: hhmm(get(t, "arrival.scheduled")),
      scheduledDeparture: hhmm(get(t, "departure.scheduled")),
      expectedArrival: boardTime(get(t, "arrival.actualOrEstimated")),
      expectedDeparture: boardTime(get(t, "departure.actualOrEstimated")),
      // A terminating train reports 0 departure delay, so read its arrival
      delayMinutes: num(t, bool(t, "departure.isDestination") ? "arrival.delayMinutes" : "departure.delayMinutes"),
      platform: str(t, "platform.number"),
      platformProvisional: bool(t, "platform.isProvisional"),
      originates: bool(t, "arrival.isSource") === true,
      terminates: bool(t, "departure.isDestination") === true,
    };
    return train;
  }).filter((t) => t.trainNumber);
  const strip = ({ originates: _o, terminates: _t, ...rest }: (typeof rows)[number]): StationBoardTrain => rest;
  return {
    station: code,
    hours,
    arrivals: rows.filter((t) => !t.originates && t.scheduledArrival).map(strip),
    departures: rows.filter((t) => !t.terminates && t.scheduledDeparture).map(strip),
  };
}

// ---------- Station timetable (full day) ----------

export async function getStationTimetable(code: string, date: string): Promise<StationTimetable> {
  const d = get(await call(`/api/v1/trains/stations/${code}/timetable/${date}`, new ApiError("INVALID_STATION", `No timetable was found for station ${code}.`)), "data");
  return {
    station: str(d, "stationCode") ?? code,
    date,
    day: str(d, "day") ?? "",
    trains: arr(get(d, "trains"))
      .map((t) => ({
        trainNumber: str(t, "trainNo") ?? "",
        trainName: titleCase(str(t, "trainName")),
        trainType: str(t, "trainType")?.replace(/_/g, " "),
        arrival: hhmm(get(t, "arrival")),
        departure: hhmm(get(t, "departure")),
        from: str(t, "from") ?? "",
        to: str(t, "to") ?? "",
        runDays: runDays(get(t, "runsOn")),
      }))
      .filter((t) => t.trainNumber),
  };
}

// ---------- Search ----------

export async function searchTrains(query: string): Promise<TrainSuggestion[]> {
  if (/^\d{5}$/.test(query)) {
    const s = await scheduleCached(query).catch(() => undefined);
    return s ? [{ number: s.trainNumber, name: s.trainName }] : [];
  }
  const raw = await call(`/api/v1/trains/search/name?name=${encodeURIComponent(query)}`, new ApiError("NO_RESULTS", "No matching trains."));
  return arr(get(raw, "data"))
    .map((t) => ({ number: str(t, "trainNo") ?? "", name: titleCase(str(t, "trainName")) }))
    .filter((t) => t.number);
}

/** Station name and state by code */
export async function getStation(code: string): Promise<Station> {
  const d = get(await call(`/api/v1/trains/stations/${code}`, new ApiError("INVALID_STATION", `We don't recognise station code ${code}.`)), "data");
  const name = str(d, "name");
  if (!name) throw new ApiError("INVALID_STATION", `We don't recognise station code ${code}.`);
  return { code: str(d, "code") ?? code, name: titleCase(name), state: str(d, "state") || undefined };
}

export async function searchStations(query: string): Promise<StationSuggestion[]> {
  const raw = await call(`/api/v1/trains/stations?q=${encodeURIComponent(query)}`, new ApiError("NO_RESULTS", "No matching stations."));
  return arr(get(raw, "data"))
    .map((s) => ({ code: str(s, "code") ?? "", name: titleCase(str(s, "name")), state: str(s, "state") }))
    .filter((s) => s.code);
}

// ---------- Seat availability ----------

function availabilityType(type: string | undefined, status: string): AvailabilityType {
  const t = `${type ?? ""} ${status}`.toUpperCase();
  if (/REGRET|NOT AVAILABLE|TRAIN CANCELLED|DEPARTED/.test(t)) return "REGRET";
  if (/RAC/.test(t)) return "RAC";
  if (/WL|WAITLIST/.test(t)) return "WAITLIST";
  if (/AVAILABLE|CURR_AVBL/.test(t)) return "AVAILABLE";
  return "OTHER";
}

export async function getAvailability(train: string, from: string, to: string, date: string, cls: string, quota: string): Promise<SeatAvailability> {
  const qs = new URLSearchParams({ from, to, date: dmy(date), class: cls, quota });
  const raw = await call(
    `/api/v1/trains/${train}/availability?${qs}`,
    new ApiError("NO_RESULTS", `Train ${train} doesn't run from ${from} to ${to} around this date in ${cls}, or the route isn't bookable.`),
  );
  const days = arr(get(raw, "availability"))
    .map((a) => {
      const status = str(a, "status") ?? "";
      return { date: str(a, "date") ?? "", status, type: availabilityType(str(a, "type"), status) };
    })
    .filter((a) => a.date);
  if (!days.length) throw new ApiError("NO_RESULTS", "No availability was returned for this journey.");
  return {
    trainNumber: str(raw, "trainNumber") ?? train,
    trainName: titleCase(str(raw, "trainName")),
    from: str(raw, "from") ?? from,
    to: str(raw, "to") ?? to,
    travelClass: str(raw, "class") ?? cls,
    quota: str(raw, "quota") ?? quota,
    days,
  };
}

// ---------- Fare ----------

const BREAKUP: [string, string][] = [
  ["baseFare", "Base fare"],
  ["reservationCharge", "Reservation"],
  ["superfastCharge", "Superfast"],
  ["cateringCharge", "Catering"],
  ["dynamicFare", "Dynamic fare"],
  ["gst", "GST"],
];

export async function getFare(train: string, from: string, to: string, quota: string): Promise<TrainFare> {
  const qs = new URLSearchParams({ from, to, class: "all", quota });
  const raw = await call(`/api/v1/trains/${train}/fare?${qs}`, new ApiError("NO_RESULTS", `No fare was found for train ${train} from ${from} to ${to}.`));
  const fares = arr(get(raw, "fares"))
    .map((f) => ({
      travelClass: str(f, "class") ?? "",
      className: str(f, "className") ?? "",
      total: num(f, "totalFare") ?? 0,
      breakup: BREAKUP.map(([k, label]) => ({ label, amount: num(f, `breakup.${k}`) ?? 0 })).filter((b) => b.amount > 0),
      berthTypes: arr(get(f, "applicableBerthTypes")).map(String),
    }))
    .filter((f) => f.travelClass && f.total > 0);
  if (!fares.length) throw new ApiError("NO_RESULTS", "No fare was returned for this journey.");
  return {
    trainNumber: str(raw, "trainNumber") ?? train,
    trainName: titleCase(str(raw, "trainName")),
    from: str(raw, "from") ?? from,
    to: str(raw, "to") ?? to,
    quota: str(raw, "quota") ?? quota,
    distanceKm: num(raw, "distanceKm"),
    fares,
  };
}

// ---------- Vacant berths after charting ----------

const BERTH_NAMES: Record<string, string> = { L: "Lower", M: "Middle", U: "Upper", R: "Side lower", P: "Side upper" };

export async function getChartVacancy(train: string, boarding: string, date: string, cls: string): Promise<ChartVacancy> {
  const qs = new URLSearchParams({ boardingStation: boarding, date, class: cls });
  const raw = await call(`/api/v1/trains/${train}/chart-vacant?${qs}`, new ApiError("NO_RESULTS", `No chart was found for train ${train} boarding at ${boarding}.`));
  // A 200 can still say the train doesn't run that day
  const code = str(raw, "code");
  if (code && /DOES_NOT_RUN|NOT_FOUND/.test(code)) throw new ApiError("NO_RESULTS", str(raw, "message") ?? `Train ${train} doesn't run on this date from ${boarding}.`);
  const byClass: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(get(raw, "summaryByClass")) ?? {})) if (typeof v === "number") byClass[k] = v;
  return {
    trainNumber: str(raw, "trainNumber", "trainNo") ?? train,
    trainName: titleCase(str(raw, "trainName")),
    boarding: str(raw, "boardingStation") ?? boarding,
    from: str(raw, "from", "originStation") ?? "",
    to: str(raw, "to") ?? "",
    date: str(raw, "date") ?? date,
    chartPrepared: bool(raw, "chartStatus.isChartPrepared", "isChartPrepared") === true,
    chartPhase: str(raw, "chartStatus.phase")?.replace(/_/g, " ").toLowerCase(),
    chartTime: str(raw, "chartStatus.currentChartTime", "chartStatus.firstChartTime"),
    remoteStation: str(raw, "chartStatus.remoteStation"),
    nextRemoteStation: str(raw, "chartStatus.nextRemoteStation"),
    total: num(raw, "totalVacantBerths") ?? 0,
    byClass,
    berths: arr(get(raw, "vacantBerths"))
      .map((b) => {
        const code = str(b, "berthCode") ?? "";
        const type = str(b, "berthType") ?? "";
        return {
          coach: str(b, "coach") ?? "",
          travelClass: str(b, "class") ?? "",
          berthNo: num(b, "berthNo") ?? 0,
          berthType: BERTH_NAMES[code] ?? (type.length > 1 ? type : code),
          from: str(b, "from") ?? "",
          to: str(b, "to") ?? "",
        };
      })
      .filter((b) => b.coach && b.berthNo),
  };
}

// ---------- Cancelled trains ----------

export async function getCancelledTrains(): Promise<CancelledTrains> {
  const raw = await call("/api/v1/trains/cancelled", new ApiError("NO_RESULTS", "No cancellation list is available right now."));
  return {
    date: str(raw, "dateISO") ?? "",
    fullCount: num(raw, "fullyCancelledCount") ?? 0,
    partialCount: num(raw, "partiallyCancelledCount") ?? 0,
    trains: arr(get(raw, "trains"))
      .map((t) => ({
        trainNumber: str(t, "trainNumber") ?? "",
        trainName: titleCase(str(t, "trainName")),
        trainType: str(t, "trainType"),
        source: titleCase(str(t, "source")),
        destination: titleCase(str(t, "destination")),
        partial: bool(t, "isPartial") === true,
        cancelledFrom: str(t, "cancelledFromStation"),
        cancelledTo: str(t, "cancelledToStation"),
        startDate: str(t, "startDate") ?? "",
      }))
      .filter((t) => t.trainNumber),
  };
}
