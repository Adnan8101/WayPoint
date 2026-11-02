import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { cached } from "@/lib/server/cache";
import { googleSource, searchText } from "@/lib/server/google/places";
import { sanitizeQuery } from "@/lib/validation";
import { parseLatLng } from "@/lib/server/google/params";

const TYPE_RE = /^[a-z_]{2,40}$/;

export const GET = handle({ group: "places-search", limit: 40 }, async (url) => {
  const q = sanitizeQuery(url.searchParams.get("q") ?? "", 100);
  if (q.length < 2) throw new ApiError("INVALID_INPUT", "Type at least 2 characters to search.");
  const type = url.searchParams.get("type") ?? undefined;
  if (type && !TYPE_RE.test(type)) throw new ApiError("INVALID_INPUT", "Unknown place category.");
  const near = parseLatLng(url.searchParams.get("near"));

  const key = `psearch:${q.toLowerCase()}:${type ?? ""}:${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ""}`;
  const { value, fetchedAt, cached: hit } = await cached(key, 60 * 60_000, () => searchText(q, { includedType: type, near }));
  return { data: value, meta: { fetchedAt, cached: hit, source: googleSource, live: false } };
});
