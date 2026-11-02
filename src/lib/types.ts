// Normalized domain types shared by the server providers and the UI.
// Provider adapters map raw API responses into these shapes so the UI never
// depends on a specific vendor.

/** How trustworthy a time value is. The UI labels every time with its kind. */
export type TimeKind = "scheduled" | "estimated" | "actual";

export interface TimeValue {
  /** ISO 8601 string with offset, or local "HH:mm" when only a wall-clock time is known */
  value: string;
  kind: TimeKind;
}

export type ErrorCode =
  | "INVALID_FLIGHT"
  | "INVALID_TRAIN"
  | "INVALID_PNR"
  | "INVALID_STATION"
  | "INVALID_AIRPORT"
  | "INVALID_INPUT"
  | "NO_RESULTS"
  | "UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "SERVICE_FAILURE"
  | "TIMEOUT"
  | "RATE_LIMITED";

export interface ApiMeta {
  /** When our server obtained the data from the provider */
  fetchedAt: string;
  /** Provider's own "last updated" timestamp, if it reports one */
  providerUpdatedAt?: string;
  source: string;
  cached: boolean;
  /** Whether the payload contains live (real-time) information */
  live: boolean;
}

export type ApiResponse<T> =
  | { ok: true; data: T; meta: ApiMeta }
  | { ok: false; error: { code: ErrorCode; message: string } };

// ---------- Flights ----------

export type FlightStatus =
  | "Scheduled"
  | "Boarding"
  | "Departed"
  | "In Air"
  | "Landed"
  | "Delayed"
  | "Cancelled"
  | "Diverted"
  | "Unknown";

export interface AirportRef {
  iata?: string;
  icao?: string;
  name: string;
  city?: string;
  countryCode?: string;
  timeZone?: string;
  lat?: number;
  lon?: number;
}

export interface FlightEnd {
  airport: AirportRef;
  scheduled?: TimeValue;
  estimated?: TimeValue;
  actual?: TimeValue;
  terminal?: string;
  gate?: string;
  baggageBelt?: string;
  checkInDesk?: string;
  /** Delay in minutes vs schedule (positive = late), when it can be computed */
  delayMinutes?: number;
}

export interface FlightPosition {
  lat: number;
  lon: number;
  altitudeFt?: number;
  groundSpeedKt?: number;
  trackDeg?: number;
  reportedAt?: string;
}

export interface Flight {
  number: string;
  airline: { name: string; iata?: string; icao?: string };
  status: FlightStatus;
  rawStatus?: string;
  departure: FlightEnd;
  arrival: FlightEnd;
  aircraft?: { model?: string; registration?: string };
  position?: FlightPosition;
  distanceKm?: number;
  /** 0..1 journey progress, only when computable from real times */
  progress?: number;
  lastUpdated?: string;
  isCargo?: boolean;
}

export interface BoardFlight {
  number: string;
  airline: { name: string; iata?: string };
  status: FlightStatus;
  /** The other airport (destination for departures, origin for arrivals) */
  otherAirport: AirportRef;
  scheduled?: TimeValue;
  estimated?: TimeValue;
  actual?: TimeValue;
  terminal?: string;
  gate?: string;
  aircraftModel?: string;
  /** Times at the other end, if the provider returns the full leg */
  otherScheduled?: TimeValue;
}

export interface AirportBoard {
  airport: string;
  departures: BoardFlight[];
  arrivals: BoardFlight[];
  windowFrom: string;
  windowTo: string;
}

export interface FlightSearchResult {
  number: string;
  airline: { name: string; iata?: string };
  from: AirportRef;
  to: AirportRef;
  departure?: TimeValue;
  arrival?: TimeValue;
  durationMinutes?: number;
  stops: number;
  status: FlightStatus;
  aircraftModel?: string;
  fare?: { amount: number; currency: string };
}

// ---------- Trains ----------

export type BookingStatusCode = "CNF" | "RAC" | "WL" | "GNWL" | "RLWL" | "PQWL" | "TQWL" | "RSWL" | "CAN" | "OTHER";

export interface PnrPassenger {
  number: number;
  bookingStatus: string;
  bookingStatusCode: BookingStatusCode;
  currentStatus: string;
  currentStatusCode: BookingStatusCode;
  coach?: string;
  berth?: string;
  berthType?: string;
}

export interface PnrStatus {
  pnr: string;
  trainNumber: string;
  trainName: string;
  journeyDate: string;
  boarding: { code: string; name?: string };
  destination: { code: string; name?: string };
  from?: { code: string; name?: string };
  travelClass: string;
  quota: string;
  chartPrepared: boolean;
  passengers: PnrPassenger[];
}

export type StationRunState = "passed" | "current" | "upcoming";

export interface RunningStation {
  code: string;
  name: string;
  day?: number;
  distanceKm?: number;
  platform?: string;
  scheduledArrival?: string;
  actualArrival?: TimeValue;
  scheduledDeparture?: string;
  actualDeparture?: TimeValue;
  delayMinutes?: number;
  state: StationRunState;
  isStop: boolean;
}

export interface TrainRunningStatus {
  trainNumber: string;
  trainName: string;
  trainType?: string;
  source: { code: string; name?: string };
  destination: { code: string; name?: string };
  journeyDate: string;
  statusMessage?: string;
  currentLocation?: string;
  lastReportedStation?: { code: string; name: string; at?: string };
  delayMinutes?: number;
  nextStation?: { code: string; name: string; eta?: TimeValue; etd?: TimeValue };
  progress?: number;
  totalDistanceKm?: number;
  coveredDistanceKm?: number;
  stations: RunningStation[];
  lastUpdated?: string;
}

export interface TrainBetween {
  trainNumber: string;
  trainName: string;
  trainType?: string;
  from: { code: string; name?: string };
  to: { code: string; name?: string };
  source?: { code: string; name?: string };
  destination?: { code: string; name?: string };
  departure: string; // HH:mm scheduled
  arrival: string; // HH:mm scheduled
  durationMinutes?: number;
  intermediateStops?: number;
  runDays: string[]; // e.g. ["Mon","Wed"]
  classes: string[];
}

export interface ScheduleStop {
  seq: number;
  code: string;
  name: string;
  arrival?: string; // HH:mm, undefined for source
  departure?: string; // HH:mm, undefined for destination
  haltMinutes?: number;
  day?: number;
  distanceKm?: number;
  isStop: boolean;
  lat?: number;
  lon?: number;
  platform?: string;
}

export interface TrainSchedule {
  trainNumber: string;
  trainName: string;
  trainType?: string;
  source: { code: string; name?: string };
  destination: { code: string; name?: string };
  runDays: string[];
  totalDurationMinutes?: number;
  totalDistanceKm?: number;
  stops: ScheduleStop[];
}

export interface TrainSuggestion {
  number: string;
  name: string;
}

export interface StationBoardTrain {
  trainNumber: string;
  trainName: string;
  source?: string;
  destination?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  expectedArrival?: TimeValue;
  expectedDeparture?: TimeValue;
  delayMinutes?: number;
  platform?: string;
}

export interface StationBoard {
  station: string;
  hours: number;
  arrivals: StationBoardTrain[];
  departures: StationBoardTrain[];
}

// ---------- Travel information ----------

export interface WeatherReport {
  location: { name: string; region?: string; country?: string; lat: number; lon: number; timeZone: string };
  current: {
    time: string;
    temperatureC: number;
    apparentC?: number;
    humidity: number;
    windKmh: number;
    windDirDeg?: number;
    code: number;
    isDay: boolean;
  };
  daily: { date: string; maxC: number; minC: number; code: number; precipProb?: number }[];
  utcOffsetSeconds: number;
  timeZoneAbbr?: string;
}

export interface Place {
  name: string;
  region?: string;
  country?: string;
  lat: number;
  lon: number;
  timeZone: string;
}
