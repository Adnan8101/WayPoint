import { handle } from "@/lib/server/handler";
import { connections } from "@/lib/server/planner";
import { planInput } from "../params";

/** Journeys with one change of train, leaving on the date */
export const GET = handle({ group: "planner", limit: 30 }, async (url) => {
  const { from, to, date } = await planInput(url);
  const data = await connections(from, to, date);
  return { data, meta: { fetchedAt: Date.now(), cached: true, source: "irctc.dev + Gemini", live: false } };
});
