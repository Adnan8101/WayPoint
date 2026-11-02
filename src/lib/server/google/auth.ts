import "server-only";
import crypto from "node:crypto";
import { ApiError } from "../errors";

// OAuth 2.0 for a Google service account (JWT bearer flow), server-only.
// The access token is cached in memory until shortly before it expires.

const SCOPE = "https://www.googleapis.com/auth/cloud-platform";
let token: { value: string; expires: number } | null = null;
let pending: Promise<string> | null = null;

const b64url = (v: Buffer | string) => Buffer.from(v).toString("base64url");

function credentials() {
  const email = process.env.GCP_CLIENT_EMAIL;
  const key = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!email || !key || !project) {
    throw new ApiError("NOT_CONFIGURED", "Maps and place information are not available right now (Google credentials not configured).");
  }
  return { email, key, project };
}

export function googleProject(): string {
  return credentials().project;
}

async function fetchToken(): Promise<string> {
  const { email, key } = credentials();
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const signature = crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key).toString("base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) {
    console.warn("[google] token exchange failed:", res.status, json.error_description);
    throw new ApiError("UNAVAILABLE", "Map and place information is unavailable right now (Google sign-in failed).");
  }
  token = { value: json.access_token, expires: Date.now() + ((json.expires_in ?? 3600) - 120) * 1000 };
  return token.value;
}

export async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now()) return token.value;
  pending ??= fetchToken().finally(() => (pending = null));
  return pending;
}

/** Authenticated JSON call to a Google API with a field mask. */
export async function googleFetch<T>(url: string, opts: { method?: "GET" | "POST"; body?: unknown; fieldMask?: string; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12_000);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "X-Goog-User-Project": googleProject(),
        "Content-Type": "application/json",
        ...(opts.fieldMask ? { "X-Goog-FieldMask": opts.fieldMask } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn(`[google] ${new URL(url).pathname} → HTTP ${res.status}: ${text.slice(0, 300)}`);
      if (res.status === 404 || res.status === 400) throw new ApiError("NO_RESULTS", "Google couldn't find that place.");
      if (res.status === 403) throw new ApiError("UNAVAILABLE", "Map and place information is unavailable (the Google API is not enabled for this project or access was denied).");
      if (res.status === 429) throw new ApiError("UNAVAILABLE", "Google's request limit has been reached. Please try again shortly.");
      throw new ApiError("SERVICE_FAILURE", "Google Maps returned an error.");
    }
    return (text ? JSON.parse(text) : {}) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === "AbortError") throw new ApiError("TIMEOUT", "Google Maps took too long to respond.");
    throw new ApiError("SERVICE_FAILURE", "Could not reach Google Maps.");
  } finally {
    clearTimeout(timer);
  }
}
