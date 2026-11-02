import "server-only";
import type {
  BookingStatusCode,
  PnrPassenger,
  PnrStatus,
  RunningStation,
  ScheduleStop,
  StationBoard,
  StationBoardTrain,
  TimeKind,
  TrainBetween,
  TrainRunningStatus,
  TrainSchedule,
} from "@/lib/types";
import { ApiError } from "../errors";
import { fetchJson } from "../http";
import { arr, bool, get, hhmm, num, str } from "../pick";

// Indian Railways data via RailRadar (https://railradar.in/docs).

const SOURCE = "RailRadar";
export const trainSource = SOURCE;

function config() {
  const key = process.env.RAILRADAR_API_KEY;
  if (!key) throw new ApiError("NOT_CONFIGURED", "Live railway information is not available right now (railway data provider not configured).");
  return { key, base: process.env.RAILRADAR_BASE_URL || "https://api.railradar.in/v1" };
}

async function call(path: string, notFound: ApiError): Promise<unknown> {
  const { key, base } = config();
  const raw = await fetchJson(`${base}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
    timeoutMs: 15_000,
    onStatus: (status) => {
      if (status === 404 || status === 400) throw notFound;
      if (status === 429) throw new ApiError("UNAVAILABLE", "The railway data provider's request limit has been reached. Please try again later.");
      if (status === 503) throw new ApiError("UNAVAILABLE", "The railway data source is temporarily degraded. Please try again shortly.");
    },
  });
  if (get(raw, "success") === false) {
    if (/NOT_FOUND|INVALID/i.test(str(raw, "error.code") ?? "")) throw notFound;
    throw new ApiError("UNAVAILABLE", "The railway data provider could not return this information right now.");
  }
  const data = get(raw, "data");
  if (data === undefined || data === null) throw notFound;
  return data;
}

// ---------- helpers ----------

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function runDays(v: unknown): string[] {
  const set = new Set(arr(v).map((d) => String(d).slice(0, 3).toLowerCase()));
  return DAY_NAMES.filter((d) => set.has(d.toLowerCase()));
}

const STATUS_CODES: BookingStatusCode[] = ["CNF", "RAC", "GNWL", "RLWL", "PQWL", "TQWL", "RSWL", "WL", "CAN"];

function statusCode(s: string): BookingStatusCode {
  const up = s.toUpperCase();
  for (const c of STATUS_CODES) if (new RegExp(`(^|[^A-Z])${c}([^A-Z]|$)`).test(up)) return c;
  if (/CONFIRM/.test(up)) return "CNF";
  if (/CANCEL/.test(up)) return "CAN";
  return "OTHER";
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// ---------- PNR ----------

export async function getPnrStatus(pnr: string): Promise<PnrStatus> {
  const d = await call(
    `/pnr/${pnr}`,
    new ApiError("INVALID_PNR", "This PNR was not found. It may be invalid, or the journey may be completed and the PNR flushed."),
  );
  const passengers: PnrPassenger[] = arr(get(d, "passengers")).map((p, i) => {
    const booking = str(p, "bookingStatus") ?? "Unknown";
    const current = str(p, "currentStatus") ?? booking;
    const currentCode =
      bool(p, "isCancelled") ? "CAN" : bool(p, "isConfirmed") && statusCode(current) === "OTHER" ? "CNF" : statusCode(current);
    // Only status, coach and berth are kept. No passenger names or ages.
    return {
      number: num(p, "passengerNumber") ?? i + 1,
      bookingStatus: booking,
      bookingStatusCode: statusCode(booking),
      currentStatus: current,
      currentStatusCode: currentCode,
      coach: str(p, "coach"),
      berth: str(p, "berthNumber"),
      berthType: str(p, "berthCode"),
    };
  });
  return {
    pnr,
    trainNumber: str(d, "train.number") ?? "",
    trainName: str(d, "train.name") ?? "",
    journeyDate: str(d, "journey.date") ?? "",
    boarding: { code: str(d, "train.boardingPoint.code") ?? "", name: str(d, "train.boardingPoint.name") },
    destination: { code: str(d, "train.reservationUpto.code", "train.destination.code") ?? "", name: str(d, "train.reservationUpto.name", "train.destination.name") },
    from: { code: str(d, "train.source.code") ?? "", name: str(d, "train.source.name") },
    travelClass: str(d, "journey.class") ?? "",
    quota: str(d, "journey.quota") ?? "",
    chartPrepared: bool(d, "charting.isPrepared") ?? false,
    passengers,
  };
}

// ---------- Live running status ----------

export async function getLiveStatus(trainNo: string, date: string): Promise<TrainRunningStatus> {
  const d = await call(
    `/trains/${trainNo}/live?date=${date}&includeCoordinates=false`,
    new ApiError("INVALID_TRAIN", `No running information was found for train ${trainNo} on the selected date.`),
  );
  const curSeq = num(d, "currentLocation.sequence");
  const curStatus = str(d, "currentLocation.status");
  const route = arr(get(d, "route"));

  const stations: RunningStation[] = route.map((s) => {
    const seq = num(s, "sequence") ?? 0;
    const status = (str(s, "status") ?? "").toLowerCase();
    const state: RunningStation["state"] =
      curSeq !== undefined ? (seq < curSeq ? "passed" : seq === curSeq ? "current" : "upcoming") : /departed|arrived|passed/.test(status) ? "passed" : "upcoming";
    const reached = state !== "upcoming";
    const aa = hhmm(get(s, "actualArrival"));
    const ad = hhmm(get(s, "actualDeparture"));
    // Once a train has passed a station the provider's times are actuals, otherwise predictions
    const arrKind: TimeKind = reached ? "actual" : "estimated";
    const depKind: TimeKind = state === "passed" || (state === "current" && /depart/.test(curStatus ?? "")) ? "actual" : "estimated";
    return {
      code: str(s, "stationCode") ?? "",
      name: str(s, "stationName") ?? "",
      distanceKm: num(s, "distance"),
      platform: str(s, "platform"),
      scheduledArrival: hhmm(get(s, "scheduledArrival")),
      scheduledDeparture: hhmm(get(s, "scheduledDeparture")),
      actualArrival: aa ? { value: aa, kind: arrKind } : undefined,
      actualDeparture: ad ? { value: ad, kind: depKind } : undefined,
      delayMinutes: num(s, reached ? "delayDeparture" : "delayArrival") ?? num(s, "delayArrival", "delayDeparture"),
      state,
      isStop: bool(s, "isHalt") ?? true,
    };
  }).filter((s) => s.code);

  const total = num(d, "train.distance") ?? stations.at(-1)?.distanceKm;
  const cur = stations.find((s) => s.state === "current");
  const nextAfter = stations.find((s) => s.state === "upcoming" && s.isStop);
  let covered: number | undefined;
  if (cur?.distanceKm !== undefined) {
    const seg = num(d, "currentLocation.segmentProgress") ?? 0;
    const nextAny = stations.find((s) => s.state === "upcoming");
    covered = cur.distanceKm + (nextAny?.distanceKm !== undefined ? seg * (nextAny.distanceKm - cur.distanceKm) : 0);
  }
  const lastReached = [...stations].reverse().find((s) => s.state !== "upcoming");
  const curName = cur?.name ?? str(d, "currentLocation.stationCode");
  const statusWord = curStatus ? curStatus.replace(/-/g, " ") : undefined;
  const exceptions = arr(get(d, "exceptions")).map((e) => str(e, "message")).filter(Boolean).join(" ");

  return {
    trainNumber: str(d, "trainNumber", "train.number") ?? trainNo,
    trainName: str(d, "trainName", "train.name") ?? "",
    trainType: str(d, "train.type"),
    source: { code: str(d, "train.source.code") ?? "", name: str(d, "train.source.name") },
    destination: { code: str(d, "train.destination.code") ?? "", name: str(d, "train.destination.name") },
    journeyDate: str(d, "startDate") ?? date,
    statusMessage: exceptions || (get(d, "isLive") === false ? "Live tracking is not active for this run. Times may be scheduled values." : undefined),
    currentLocation: curName ? `${statusWord ? statusWord[0].toUpperCase() + statusWord.slice(1) : "At"} ${curName}${cur ? ` (${cur.code})` : ""}` : undefined,
    lastReportedStation: lastReached ? { code: lastReached.code, name: lastReached.name, at: str(d, "lastUpdatedAt") } : undefined,
    delayMinutes: num(d, "delayMinutes"),
    nextStation: nextAfter ? { code: nextAfter.code, name: nextAfter.name, eta: nextAfter.actualArrival, etd: nextAfter.actualDeparture } : undefined,
    totalDistanceKm: total,
    coveredDistanceKm: covered,
    progress: total && covered !== undefined ? Math.min(1, Math.max(0, covered / total)) : undefined,
    stations,
    lastUpdated: str(d, "lastUpdatedAt"),
  };
}

// ---------- Trains between stations ----------

export async function getTrainsBetween(from: string, to: string, date: string): Promise<TrainBetween[]> {
  const d = await call(
    `/trains/between/${from}/${to}?date=${date}`,
    new ApiError("NO_RESULTS", `No trains were found between ${from} and ${to} on ${date}.`),
  );
  const fromRef = { code: str(d, "from.code") ?? from, name: str(d, "from.name") };
  const toRef = { code: str(d, "to.code") ?? to, name: str(d, "to.name") };
  const list = arr(get(d, "trains")).map((t) => ({
    trainNumber: str(t, "train.number") ?? "",
    trainName: str(t, "train.name") ?? "",
    trainType: str(t, "train.type"),
    from: fromRef,
    to: toRef,
    departure: hhmm(get(t, "from.departure")) ?? "",
    arrival: hhmm(get(t, "to.arrival")) ?? "",
    durationMinutes: num(t, "duration"),
    intermediateStops: num(t, "totalHaltsBetween"),
    runDays: runDays(get(t, "train.runDays")),
    classes: [] as string[], // not provided by this endpoint
  })).filter((t) => t.trainNumber);
  if (!list.length) throw new ApiError("NO_RESULTS", `No trains were found between ${from} and ${to} on ${date}.`);
  return list;
}

// ---------- Schedule ----------

export async function getSchedule(trainNo: string): Promise<TrainSchedule> {
  const d = await call(`/trains/${trainNo}`, new ApiError("INVALID_TRAIN", `No schedule was found for train ${trainNo}.`));
  const route = arr(get(d, "route"));
  const stops: ScheduleStop[] = route.map((s, i) => {
    const arrival = i === 0 ? undefined : hhmm(get(s, "arrival")) ?? undefined;
    const departure = i === route.length - 1 ? undefined : hhmm(get(s, "departure")) ?? undefined;
    let halt: number | undefined;
    if (arrival && departure) {
      const dayGap = (num(s, "departureDay") ?? 0) - (num(s, "arrivalDay") ?? 0);
      halt = dayGap * 1440 + toMin(departure) - toMin(arrival);
      if (halt < 0) halt += 1440;
    }
    return {
      seq: num(s, "sequence") ?? i + 1,
      code: str(s, "station.code") ?? "",
      name: str(s, "station.name") ?? "",
      arrival,
      departure,
      haltMinutes: halt,
      day: num(s, "arrivalDay", "departureDay"),
      distanceKm: num(s, "distance"),
      isStop: bool(s, "isHalt") ?? true,
      platform: str(s, "platform"),
    };
  }).filter((s) => s.code);
  if (!stops.length) throw new ApiError("INVALID_TRAIN", `No schedule was found for train ${trainNo}.`);

  const first = stops[0];
  const last = stops[stops.length - 1];
  let total = num(d, "train.duration");
  if (total === undefined && first.departure && last.arrival && last.day !== undefined) {
    total = (last.day - (first.day ?? 1)) * 1440 + toMin(last.arrival) - toMin(first.departure);
  }
  return {
    trainNumber: str(d, "train.number") ?? trainNo,
    trainName: str(d, "train.name") ?? "",
    trainType: str(d, "train.type"),
    source: { code: str(d, "train.source.code") ?? first.code, name: str(d, "train.source.name") ?? first.name },
    destination: { code: str(d, "train.destination.code") ?? last.code, name: str(d, "train.destination.name") ?? last.name },
    runDays: runDays(get(d, "train.runDays")),
    totalDurationMinutes: total,
    totalDistanceKm: num(d, "train.distance") ?? last.distanceKm,
    stops,
  };
}

// ---------- Station live board ----------

function boardTrain(t: unknown): StationBoardTrain {
  const ed = str(t, "live.expectedDepartureTime");
  const ea = str(t, "live.expectedArrivalTime");
  const edh = hhmm(ed);
  const eah = hhmm(ea);
  return {
    trainNumber: str(t, "train.number") ?? "",
    trainName: str(t, "train.name") ?? "",
    source: str(t, "train.source"),
    destination: str(t, "train.destination"),
    scheduledArrival: hhmm(get(t, "stop.arrival")),
    scheduledDeparture: hhmm(get(t, "stop.departure")),
    expectedArrival: eah ? { value: eah, kind: "estimated" } : undefined,
    expectedDeparture: edh ? { value: edh, kind: "estimated" } : undefined,
    delayMinutes: num(t, "live.delayMinutes"),
    platform: str(t, "live.platform"),
  };
}

export async function getStationBoard(code: string, hours: number): Promise<StationBoard> {
  const d = await call(
    `/stations/${code}/live?hours=${hours}`,
    new ApiError("INVALID_STATION", `No live information was found for station ${code}.`),
  );
  const trains = arr(get(d, "trains")).map(boardTrain).filter((t) => t.trainNumber);
  return {
    station: code,
    hours,
    // A train that originates here only departs; one that terminates here only arrives.
    arrivals: trains.filter((t) => t.source !== code && t.scheduledArrival),
    departures: trains.filter((t) => t.destination !== code && t.scheduledDeparture),
  };
}

// ---------- Train search (autocomplete) ----------

export async function searchTrains(query: string): Promise<{ number: string; name: string }[]> {
  const d = await call(`/lookup/search/trains?q=${encodeURIComponent(query)}&limit=10`, new ApiError("NO_RESULTS", "No matching trains."));
  return arr(d)
    .map((t) => ({ number: str(t, "number") ?? "", name: str(t, "name") ?? "" }))
    .filter((t) => t.number);
}
