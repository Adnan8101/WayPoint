import { handle } from "@/lib/server/handler";
import { cached } from "@/lib/server/cache";
import { getCancelledTrains, railSource } from "@/lib/server/providers/irctcdev";

export const GET = handle({ group: "train-cancelled", limit: 30 }, async () => {
  const { value, fetchedAt, cached: hit } = await cached("cancelled", 15 * 60_000, getCancelledTrains);
  return { data: value, meta: { fetchedAt, cached: hit, source: railSource, live: true } };
});
