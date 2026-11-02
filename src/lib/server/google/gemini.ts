import "server-only";
import { ApiError } from "../errors";
import { arr, get, str } from "../pick";
import { accessToken, googleProject } from "./auth";

// Gemini on Vertex AI, called with the service account. Model and region come
// from GEMINI_MODEL and GOOGLE_CLOUD_LOCATION. Gemini only ever explains,
// extracts or translates here; it never produces statuses, times or fares.

export const geminiSource = "Gemini";

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

function endpoint(): string {
  const loc = process.env.GOOGLE_CLOUD_LOCATION || "global";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const host = loc === "global" ? "aiplatform.googleapis.com" : `${loc}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${googleProject()}/locations/${loc}/publishers/google/models/${model}:generateContent`;
}

async function generate(system: string, parts: Part[], config: Record<string, unknown>, timeoutMs = 25_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: { Authorization: `Bearer ${await accessToken()}`, "X-Goog-User-Project": googleProject(), "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.1, ...config },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    const body = await res.text();
    if (!res.ok) {
      console.warn(`[gemini] HTTP ${res.status}: ${body.slice(0, 300)}`);
      throw new ApiError(res.status === 429 ? "RATE_LIMITED" : "UNAVAILABLE", "The assistant is unavailable right now.");
    }
    const json = JSON.parse(body);
    const text = arr(get(arr(get(json, "candidates"))[0], "content.parts"))
      .map((p) => str(p, "text") ?? "")
      .join("")
      .trim();
    if (!text) throw new ApiError("UNAVAILABLE", "The assistant didn't return an answer.");
    return text;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError") throw new ApiError("TIMEOUT", "The assistant took too long to answer.");
    throw new ApiError("SERVICE_FAILURE", "Could not reach the assistant.");
  } finally {
    clearTimeout(timer);
  }
}

/** Structured output: Gemini fills `schema` (OpenAPI subset) and we parse it */
export async function generateJson<T>(system: string, parts: Part[], schema: Record<string, unknown>): Promise<T> {
  const text = await generate(system, parts, { responseMimeType: "application/json", responseSchema: schema });
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("SERVICE_FAILURE", "The assistant returned an unreadable answer.");
  }
}

export async function generateText(system: string, prompt: string): Promise<string> {
  return generate(system, [{ text: prompt }], { maxOutputTokens: 700 });
}
