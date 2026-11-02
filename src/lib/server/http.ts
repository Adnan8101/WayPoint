import "server-only";
import { ApiError } from "./errors";

interface FetchOptions {
  headers?: Record<string, string>;
  /** JSON body; sends a POST when present */
  body?: unknown;
  timeoutMs?: number;
  /** Called for non-2xx responses before generic handling; may throw a more specific ApiError */
  onStatus?: (status: number, body: string) => void;
}

/** fetch JSON from an upstream provider with a hard timeout and normalized errors. */
export async function fetchJson<T = unknown>(url: string, opts: FetchOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.body !== undefined ? "POST" : "GET",
      headers: { Accept: "application/json", ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...opts.headers },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new ApiError("TIMEOUT", "The travel data provider took too long to respond.");
    }
    throw new ApiError("SERVICE_FAILURE", "Could not reach the travel data provider.");
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  if (!res.ok) {
    opts.onStatus?.(res.status, text);
    if (res.status === 404 || res.status === 204) {
      throw new ApiError("NO_RESULTS", "No information was found for this search.");
    }
    if (res.status === 429) {
      throw new ApiError("UNAVAILABLE", "The data provider's request limit has been reached. Please try again shortly.");
    }
    if (res.status === 401 || res.status === 403) {
      console.warn(`[provider] ${new URL(url).host} rejected the API key (HTTP ${res.status}): ${text.slice(0, 200)}`);
      throw new ApiError("UNAVAILABLE", "The data provider rejected our credentials. Live information is unavailable.");
    }
    throw new ApiError("SERVICE_FAILURE", `The travel data provider returned an error (${res.status}).`);
  }
  if (res.status === 204 || text.trim() === "") {
    throw new ApiError("NO_RESULTS", "No information was found for this search.");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("SERVICE_FAILURE", "The travel data provider returned an unreadable response.");
  }
}
