import "server-only";
import { NextResponse } from "next/server";
import type { ApiMeta, ApiResponse } from "@/lib/types";
import { ApiError } from "./errors";
import { clientKey, rateLimit } from "./rate-limit";

export interface HandlerResult<T> {
  data: T;
  meta: Omit<ApiMeta, "fetchedAt" | "cached"> & { fetchedAt: number; cached: boolean };
}

interface Options {
  group: string;
  /** Requests per minute per client */
  limit?: number;
  /** Cache-Control for the browser/CDN. PNR responses must use "no-store". */
  cacheControl?: string;
}

/** Wraps a route handler: rate limiting, error normalization and the JSON envelope. */
export function handle<T>(opts: Options, fn: (url: URL, req: Request) => Promise<HandlerResult<T>>) {
  return async (req: Request): Promise<NextResponse<ApiResponse<T>>> => {
    if (!rateLimit(`${opts.group}:${clientKey(req)}`, opts.limit ?? 30, opts.limit ?? 30)) {
      return NextResponse.json(
        { ok: false, error: { code: "RATE_LIMITED", message: "Too many requests. Please wait a moment and try again." } },
        { status: 429, headers: { "Retry-After": "30", "Cache-Control": "no-store" } },
      );
    }
    try {
      const { data, meta } = await fn(new URL(req.url), req);
      return NextResponse.json(
        { ok: true, data, meta: { ...meta, fetchedAt: new Date(meta.fetchedAt).toISOString() } },
        { headers: { "Cache-Control": opts.cacheControl ?? "private, max-age=30" } },
      );
    } catch (err) {
      const e =
        err instanceof ApiError
          ? err
          : new ApiError("SERVICE_FAILURE", "Something went wrong while retrieving travel information.");
      if (!(err instanceof ApiError)) console.error(`[api:${opts.group}]`, err);
      return NextResponse.json(
        { ok: false, error: { code: e.code, message: e.message } },
        { status: e.status, headers: { "Cache-Control": "no-store" } },
      );
    }
  };
}
