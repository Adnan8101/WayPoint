import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { generateJson, geminiSource } from "@/lib/server/google/gemini";
import { LANGUAGES } from "@/lib/languages";

const MAX_TEXTS = 60;
const MAX_LEN = 400;
const MAX_ENTRIES = 50_000;

// Each phrase is translated once per language and remembered (until restart)
const memo = new Map<string, string>();

const SYSTEM = [
  "You translate the interface text of a train and flight status website.",
  "Translate each string in the input array into the target language, keeping the same order and count.",
  "Keep codes, numbers, times, dates, train and flight numbers, station and airport codes, units and brand names (WayPoint, IRCTC, Google) unchanged.",
  "Keep translations short enough for buttons and labels. Return only the JSON array.",
].join(" ");

export const POST = handle({ group: "translate", limit: 120, cacheControl: "no-store" }, async (_url, req) => {
  const body = (await req.json().catch(() => ({}))) as { lang?: string; texts?: unknown };
  const lang = LANGUAGES.find((l) => l.code === body.lang && l.code !== "en");
  if (!lang) throw new ApiError("INVALID_INPUT", "Unsupported language.");
  const texts = Array.isArray(body.texts) ? body.texts.slice(0, MAX_TEXTS).map((t) => String(t).slice(0, MAX_LEN)) : [];
  if (!texts.length) return { data: { translations: [] }, meta: { fetchedAt: Date.now(), cached: true, source: geminiSource, live: false } };

  const out = texts.map((t) => memo.get(`${lang.code}:${t}`));
  const missing = [...new Set(texts.filter((_, i) => out[i] === undefined))];
  if (missing.length) {
    const result = await generateJson<string[]>(`${SYSTEM} Target language: ${lang.english}.`, [{ text: JSON.stringify(missing) }], {
      type: "ARRAY",
      items: { type: "STRING" },
    });
    // A mismatched batch is discarded rather than risk putting text in the wrong place
    if (Array.isArray(result) && result.length === missing.length) {
      if (memo.size > MAX_ENTRIES) memo.clear();
      missing.forEach((t, i) => memo.set(`${lang.code}:${t}`, String(result[i] ?? t)));
    }
  }
  const translations = texts.map((t) => memo.get(`${lang.code}:${t}`) ?? t);
  return { data: { translations }, meta: { fetchedAt: Date.now(), cached: !missing.length, source: geminiSource, live: false } };
});
