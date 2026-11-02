import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { generateJson, geminiSource } from "@/lib/server/google/gemini";
import { normalizePnr } from "@/lib/validation";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// Reads the PNR off a ticket photo or screenshot. The image is processed in memory and never stored.
export const POST = handle({ group: "assistant-ticket", limit: 6, cacheControl: "no-store" }, async (_url, req) => {
  const body = (await req.json().catch(() => ({}))) as { image?: unknown };
  const m = String(body.image ?? "").match(/^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || !TYPES.includes(m[1])) throw new ApiError("INVALID_INPUT", "Upload a JPG, PNG, WebP or HEIC photo of your ticket.");
  if ((m[2].length * 3) / 4 > MAX_BYTES) throw new ApiError("INVALID_INPUT", "That image is too large. Use one under 4 MB.");

  const out = await generateJson<{ pnr?: string; found?: boolean }>(
    "You read Indian Railways tickets, e-tickets, SMS screenshots and booking emails. Return the 10-digit PNR number exactly as printed. If there is no clearly printed 10-digit PNR, set found to false. Never guess digits.",
    [{ inlineData: { mimeType: m[1], data: m[2] } }, { text: "What is the PNR on this ticket?" }],
    { type: "OBJECT", properties: { found: { type: "BOOLEAN" }, pnr: { type: "STRING" } }, required: ["found"] },
  );
  const pnr = out.found ? normalizePnr(out.pnr ?? "") : null;
  if (!pnr) throw new ApiError("NO_RESULTS", "We couldn't read a 10-digit PNR on that image. Try a sharper photo, or type it in.");
  return { data: { pnr }, meta: { fetchedAt: Date.now(), cached: false, source: geminiSource, live: false } };
});
