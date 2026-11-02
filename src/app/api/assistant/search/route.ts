import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { generateJson, geminiSource } from "@/lib/server/google/gemini";
import { searchTrains } from "@/lib/server/providers/irctcdev";
import { resolveStations, stationOnTrain } from "@/lib/server/providers/station-resolver";
import { searchAirports } from "@/lib/server/providers/ourairports";
import { todayIST } from "@/lib/dates";
import { isValidDate, normalizeAirportCode, normalizeFlightNumber, normalizePnr, normalizeStationCode, normalizeTrainNumber, sanitizeQuery } from "@/lib/validation";
import type { AssistantIntent } from "@/lib/types";

const TOOLS = [
  "planner", "pnr", "train_status", "trains_between", "train_schedule", "train_route", "seats", "vacancy", "cancelled", "station",
  "flight_status", "flight_tracker", "flight_search", "airport", "weather", "unknown",
] as const;

type Maybe = string | null | undefined;

interface Parsed {
  tool: (typeof TOOLS)[number];
  pnr?: Maybe;
  train?: Maybe;
  from?: Maybe;
  to?: Maybe;
  station?: Maybe;
  flight?: Maybe;
  airport?: Maybe;
  date?: Maybe;
  travelClass?: Maybe;
  quota?: Maybe;
  place?: Maybe;
}

const FIELDS: Record<string, Record<string, unknown>> = {
  train: { type: "STRING", description: "Train number or train name as the user wrote it, else null" },
  pnr: { type: "STRING", description: "10-digit PNR if given, else null" },
  from: { type: "STRING", description: "Origin station/airport/city name or code as written, else null" },
  to: { type: "STRING", description: "Destination station/airport/city name or code as written, else null" },
  station: { type: "STRING", description: "A single station name or code, else null" },
  flight: { type: "STRING", description: "Flight number (airline code plus digits), else null" },
  airport: { type: "STRING", description: "A single airport name, city or code, else null" },
  date: { type: "STRING", description: "Journey date as YYYY-MM-DD resolved from words like tomorrow or Friday, else null" },
  travelClass: { type: "STRING", enum: ["SL", "3E", "3A", "2A", "1A", "CC", "EC"], description: "Train class only, else null" },
  quota: { type: "STRING", enum: ["GN", "TQ", "PT", "LD"], description: "TQ for tatkal, PT premium tatkal, LD ladies, else null" },
  place: { type: "STRING", description: "City or area for weather, else null" },
};

// Every field is required but nullable, so the model considers each one instead of skipping it
const SCHEMA = {
  type: "OBJECT",
  properties: {
    tool: { type: "STRING", enum: [...TOOLS] },
    ...Object.fromEntries(Object.entries(FIELDS).map(([k, v]) => [k, { ...v, nullable: true }])),
  },
  required: ["tool", ...Object.keys(FIELDS)],
  propertyOrdering: ["tool", ...Object.keys(FIELDS)],
};

function system(today: string) {
  const weekday = new Date(`${today}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return [
    "You route travel questions for an Indian train and global flight information site to exactly one tool, and extract every detail the user gave.",
    `Today is ${weekday} ${today} (India time). Whenever the user mentions a day (today, tonight, tomorrow, a weekday, 'next Monday', a date), you MUST fill date as YYYY-MM-DD; a bare weekday means its next occurrence.`,
    "You MUST fill from and to whenever the user names two places, train with any train number or name, travelClass for AC/sleeper/chair car words, and quota for tatkal/ladies.",
    "Two places with no train number or name means trains_between for trains, or flight_search when they mention flying, flights or airports. Use seats only when a specific train is named.",
    "Tools: planner (wanting to travel or go somewhere by train on a date, finding trains with seats, flexible dates or a journey with a change; use this when they say they want to go, travel or reach a place); pnr (PNR status); train_status (where is a running train); trains_between (trains from A to B); train_schedule (a train's timetable);",
    "train_route (a train's stops on a map); seats (seat availability or fare for a train between two stations; AC means 3A unless stated, sleeper means SL, tatkal means quota TQ);",
    "vacancy (vacant berths after chart preparation); cancelled (cancelled trains today); station (a railway station's live board);",
    "flight_status (status of a flight number); flight_tracker (track a flight on a map); flight_search (flights between two airports); airport (an airport's board); weather (weather somewhere).",
    "Copy station, airport and train names exactly as the user wrote them; never invent codes, numbers or dates the user didn't imply.",
    "If the request isn't about these, use unknown.",
  ].join(" ");
}

/** The single most important station for a place (codes and names both work) */
async function stationCode(text?: string | null): Promise<string | undefined> {
  if (!text) return undefined;
  return (await resolveStations(text).catch(() => undefined))?.stations[0]?.code;
}

/** For a named train, the stop that serves the place */
const stopOn = (train: string | undefined, text?: string | null) => (text ? stationOnTrain(train, text) : Promise.resolve(undefined));

/** Plain text kept for searches that expand a city themselves */
const placeText = (text?: string | null) => (text ? sanitizeQuery(text, 60) || undefined : undefined);

/**
 * Models sometimes swap origin and destination. When the request says "from X",
 * whichever of the two names follows "from" first is the origin.
 */
function fixOrder(q: string, p: Parsed): Parsed {
  if (!p.from || !p.to) return p;
  const lower = q.toLowerCase();
  const at = lower.search(/\bfrom\b/);
  if (at < 0) return p;
  const f = lower.indexOf(p.from.toLowerCase(), at);
  const t = lower.indexOf(p.to.toLowerCase(), at);
  const swap = t >= 0 && (f < 0 || t < f);
  return swap ? { ...p, from: p.to, to: p.from } : p;
}

async function airportCode(text?: string | null): Promise<string | undefined> {
  if (!text) return undefined;
  const code = normalizeAirportCode(text);
  const hits = await searchAirports(text, 3).catch(() => []);
  if (code && hits.some((h) => h.iata === code)) return code;
  return hits[0]?.iata ?? code ?? undefined;
}

async function trainNumber(text?: string | null): Promise<string | undefined> {
  if (!text) return undefined;
  const direct = text.match(/\b\d{5}\b/)?.[0];
  if (direct) return normalizeTrainNumber(direct) ?? undefined;
  return (await searchTrains(text).catch(() => []))[0]?.number;
}

/** Turn the parsed request into a page URL, resolving names to codes with live search */
async function toIntent(p: Parsed, today: string): Promise<AssistantIntent | null> {
  const date = p.date && isValidDate(p.date) ? p.date : undefined;
  const qs = (o: Record<string, string | null | undefined>) => new URLSearchParams(Object.entries(o).filter(([, v]) => v) as [string, string][]).toString();
  switch (p.tool) {
    case "planner": {
      const from = placeText(p.from);
      const to = placeText(p.to);
      return { href: `/planner?${qs({ from, to, date: date ?? today, class: p.travelClass, quota: p.quota })}`, summary: to ? `a journey plan${from ? ` from ${from}` : ""} to ${to}` : "the journey planner" };
    }
    case "pnr": {
      const pnr = normalizePnr(p.pnr ?? "");
      return { href: pnr ? `/pnr-status#pnr=${pnr}` : "/pnr-status", summary: pnr ? "PNR status" : "PNR status: enter your PNR" };
    }
    case "train_status": {
      const train = await trainNumber(p.train);
      return { href: `/train-status?${qs({ train, date: date && date <= today ? date : undefined })}`, summary: train ? `Live status of train ${train}` : "Live train status" };
    }
    case "train_schedule":
    case "train_route": {
      const train = await trainNumber(p.train);
      const path = p.tool === "train_schedule" ? "/train-schedule" : "/train-route";
      return { href: `${path}?${qs({ train })}`, summary: train ? `${p.tool === "train_schedule" ? "Timetable" : "Route"} of train ${train}` : "Train timetable" };
    }
    case "trains_between": {
      // The search expands cities to all their main stations
      const from = placeText(p.from);
      const to = placeText(p.to);
      return { href: `/trains-between-stations?${qs({ from, to, date: date ?? today })}`, summary: from && to ? `trains from ${from} to ${to}` : "Trains between stations" };
    }
    case "seats": {
      const train = await trainNumber(p.train);
      // With a train, use the stops it makes; without one, search the whole route (cities included)
      const [from, to] = train ? await Promise.all([stopOn(train, p.from), stopOn(train, p.to)]) : [placeText(p.from), placeText(p.to)];
      return { href: `/seat-availability?${qs({ train, from, to, date, class: p.travelClass, quota: p.quota })}`, summary: train ? `seats and fare on ${train}` : from && to ? `trains and seats from ${from} to ${to}` : "Seats and fare" };
    }
    case "vacancy": {
      const train = await trainNumber(p.train);
      const boarding = await stopOn(train, p.station ?? p.from);
      return { href: `/chart-vacancy?${qs({ train, boarding, date, class: p.travelClass })}`, summary: train ? `Vacant berths on ${train}` : "Vacant berths" };
    }
    case "cancelled":
      return { href: "/cancelled-trains", summary: "Cancelled trains today" };
    case "station": {
      const code = await stationCode(p.station ?? p.from);
      return { href: code ? `/railway-stations/${code}` : "/railway-stations", summary: code ? `Station ${code}` : "Railway stations" };
    }
    case "flight_status":
    case "flight_tracker": {
      const flight = normalizeFlightNumber(p.flight ?? "") ?? undefined;
      const path = p.tool === "flight_status" ? "/flight-status" : "/flight-tracker";
      return { href: `${path}?${qs({ flight, date })}`, summary: flight ? `Flight ${flight}` : "Flight status" };
    }
    case "flight_search": {
      const [from, to] = await Promise.all([airportCode(p.from), airportCode(p.to)]);
      return { href: `/flight-search?${qs({ from, to, date: date ?? today })}`, summary: from && to ? `Flights ${from} → ${to}` : "Flight search" };
    }
    case "airport": {
      const code = await airportCode(p.airport ?? p.from);
      return { href: code ? `/airports/${code}` : "/airports", summary: code ? `Airport ${code}` : "Airports" };
    }
    case "weather":
      return { href: `/travel-information?${qs({ wx: p.place })}#weather`, summary: p.place ? `Weather in ${p.place}` : "Weather" };
    default:
      return null;
  }
}

export const POST = handle({ group: "assistant-search", limit: 20, cacheControl: "no-store" }, async (_url, req) => {
  const body = (await req.json().catch(() => ({}))) as { q?: unknown };
  const q = sanitizeQuery(String(body.q ?? ""), 200);
  if (q.length < 3) throw new ApiError("INVALID_INPUT", "Tell me what you're looking for.");
  const today = todayIST();
  const { value } = await cached(`ask:${today}:${q.toLowerCase()}`, 60 * 60_000, async () => {
    const parsed = await generateJson<Parsed>(system(today), [{ text: q }], SCHEMA);
    return toIntent(fixOrder(q, parsed), today);
  });
  if (!value) throw new ApiError("NO_RESULTS", "I can help with trains, PNRs, flights, airports, stations and weather. Try asking about one of those.");
  return { data: value, meta: { fetchedAt: Date.now(), cached: false, source: geminiSource, live: false } };
});
