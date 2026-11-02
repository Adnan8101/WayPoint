"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiMeta, ApiResponse, ErrorCode } from "@/lib/types";

export interface ApiRequest {
  url: string;
  /** Sent as a JSON POST body when present (used for PNR so it stays out of URLs) */
  body?: unknown;
}

export type ApiState<T> =
  | { status: "idle" }
  | { status: "loading"; previous?: { data: T; meta: ApiMeta } }
  | { status: "success"; data: T; meta: ApiMeta }
  | { status: "error"; code: ErrorCode; message: string };

const CLIENT_TIMEOUT_MS = 20_000;
const inflight = new Map<string, Promise<ApiResponse<unknown>>>();

async function request<T>(req: ApiRequest): Promise<ApiResponse<T>> {
  const key = req.url + (req.body ? JSON.stringify(req.body) : "");
  const existing = inflight.get(key);
  if (existing) return existing as Promise<ApiResponse<T>>;

  const p = (async (): Promise<ApiResponse<T>> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    try {
      const res = await fetch(req.url, {
        method: req.body ? "POST" : "GET",
        headers: req.body ? { "Content-Type": "application/json" } : undefined,
        body: req.body ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
      if (json && typeof json === "object" && "ok" in json) return json;
      return { ok: false, error: { code: "SERVICE_FAILURE", message: "The server returned an unexpected response." } };
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return { ok: false, error: { code: "TIMEOUT", message: "The request timed out. Please try again." } };
      }
      return { ok: false, error: { code: "SERVICE_FAILURE", message: "Network error. Check your connection and try again." } };
    } finally {
      clearTimeout(timer);
    }
  })();
  inflight.set(key, p);
  p.finally(() => inflight.delete(key));
  return p;
}

/** Fetches whenever `req` changes (null = idle). Identical concurrent requests share one call. */
export function useApi<T>(req: ApiRequest | null) {
  const [state, setState] = useState<ApiState<T>>({ status: "idle" });
  const [nonce, setNonce] = useState(0);
  const key = req ? req.url + (req.body ? JSON.stringify(req.body) : "") : null;
  const reqRef = useRef(req);
  reqRef.current = req;

  useEffect(() => {
    const current = reqRef.current;
    if (!current) {
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setState((s) => ({ status: "loading", previous: s.status === "success" ? { data: s.data, meta: s.meta } : undefined }));
    request<T>(current).then((res) => {
      if (cancelled) return;
      setState(res.ok ? { status: "success", data: res.data, meta: res.meta } : { status: "error", ...res.error });
    });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  return { state, refresh };
}

/** Lightweight GET helper for suggestions (no state machine) */
export async function getJson<T>(url: string): Promise<T | null> {
  const res = await request<T>({ url });
  return res.ok ? res.data : null;
}
