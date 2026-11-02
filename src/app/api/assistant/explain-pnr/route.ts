import { handle } from "@/lib/server/handler";
import { ApiError } from "@/lib/server/errors";
import { generateText, geminiSource } from "@/lib/server/google/gemini";
import { LANGUAGES } from "@/lib/languages";

const SYSTEM = [
  "You explain Indian Railways PNR results in plain, friendly language for a traveller.",
  "Explain what each passenger's status code means (for example CNF, RAC, WL, GNWL, RLWL, PQWL, TQWL), what the chart status means, and practical next steps.",
  "Never estimate or predict the chance of confirmation, never invent coach or berth numbers, and never state rules you are unsure of; say to check IRCTC for refunds and rules.",
  "Do not say whether a waitlisted passenger may board or will be refunded: those rules differ between e-tickets and counter tickets, so point them to IRCTC's current rules instead.",
  "Use short paragraphs or a short list. No headings. Under 160 words.",
].join(" ");

// Only status data is sent: never the PNR number or passenger details beyond status
export const POST = handle({ group: "assistant-pnr", limit: 10, cacheControl: "no-store" }, async (_url, req) => {
  const body = (await req.json().catch(() => ({}))) as {
    lang?: string;
    chartPrepared?: boolean;
    travelClass?: string;
    quota?: string;
    passengers?: { currentStatus?: string; bookingStatus?: string }[];
  };
  const passengers = Array.isArray(body.passengers) ? body.passengers.slice(0, 6) : [];
  if (!passengers.length) throw new ApiError("INVALID_INPUT", "Nothing to explain.");
  const clip = (v: unknown) => String(v ?? "").replace(/[^\w\s/,-]/g, "").slice(0, 40);
  const lang = LANGUAGES.find((l) => l.code === body.lang) ?? LANGUAGES[0];

  const facts = [
    `Class: ${clip(body.travelClass) || "unknown"}. Quota: ${clip(body.quota) || "unknown"}.`,
    `Chart prepared: ${body.chartPrepared ? "yes" : "no"}.`,
    ...passengers.map((p, i) => `Passenger ${i + 1}: current status "${clip(p.currentStatus)}"${p.bookingStatus ? `, booked as "${clip(p.bookingStatus)}"` : ""}.`),
  ].join("\n");
  const text = await generateText(`${SYSTEM} Answer in ${lang.english}.`, facts);
  return { data: { text }, meta: { fetchedAt: Date.now(), cached: false, source: geminiSource, live: false } };
});
