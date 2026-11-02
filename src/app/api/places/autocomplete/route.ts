import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { autocomplete, googleSource } from "@/lib/server/google/places";
import { sanitizeQuery } from "@/lib/validation";

const TYPES = /^[a-z_]{2,40}(,[a-z_]{2,40}){0,4}$/;

// Not cached: autocomplete is billed per session and results depend on the session token.
export const GET = handle({ group: "places-autocomplete", limit: 120, cacheControl: "no-store" }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("q") ?? "", 80);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Type at least 2 characters.");
  const session = url.searchParams.get("session") ?? "";
  if (!/^[A-Za-z0-9-]{8,64}$/.test(session)) throw new ApiError("INVALID_INPUT", "Invalid search session.");
  const types = url.searchParams.get("types");
  if (types && !TYPES.test(types)) throw new ApiError("INVALID_INPUT", "Unknown place type.");

  const data = await autocomplete(q, session, types?.split(","));
  return { data, meta: { fetchedAt: Date.now(), cached: false, source: googleSource, live: false } };
});
