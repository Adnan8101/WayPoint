import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { getPnrStatus, pnrSource } from "@/lib/server/providers/irctcdev";
import { normalizePnr } from "@/lib/validation";

// PNR results are personal booking data: never cached server-side or by the
// browser/CDN, never logged. Requested by POST so the PNR stays out of URLs
// and server access logs.
export const POST = handle({ group: "pnr", limit: 10, cacheControl: "no-store" }, async (_url, req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError("INVALID_PNR", "Enter a valid 10-digit PNR number.");
  }
  const pnr = normalizePnr(String((body as { pnr?: unknown })?.pnr ?? ""));
  if (!pnr) throw new ApiError("INVALID_PNR", "A PNR number must be exactly 10 digits.");
  const data = await getPnrStatus(pnr);
  return { data, meta: { fetchedAt: Date.now(), cached: false, source: pnrSource, live: true } };
});
