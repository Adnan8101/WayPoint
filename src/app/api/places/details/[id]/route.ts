import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { googleSource, placeDetails } from "@/lib/server/google/places";
import { PLACE_ID_RE } from "@/lib/server/google/params";

export const GET = handle({ group: "places-details", limit: 60 }, async (url) => {
  const id = decodeURIComponent(url.pathname.split("/").at(-1) ?? "");
  if (!PLACE_ID_RE.test(id)) throw new ApiError("INVALID_INPUT", "Invalid place.");
  const session = url.searchParams.get("session") ?? undefined;
  const { value, fetchedAt, cached: hit } = await cached(`pdetails:${id}`, 60 * 60_000, () =>
    placeDetails(id, session && /^[A-Za-z0-9-]{8,64}$/.test(session) ? session : undefined),
  );
  return { data: value, meta: { fetchedAt, cached: hit, source: googleSource, live: false } };
});
