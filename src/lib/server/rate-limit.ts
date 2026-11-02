import "server-only";

interface Bucket {
  tokens: number;
  updated: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Token-bucket limiter keyed by client + route group. In-memory, so it is per
 * server instance; use a shared store (e.g. Redis/Upstash) when scaling out.
 */
export function rateLimit(key: string, capacity = 30, refillPerMinute = 30): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updated: now };
  b.tokens = Math.min(capacity, b.tokens + ((now - b.updated) / 60_000) * refillPerMinute);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (now - v.updated > 300_000) buckets.delete(k);
  }
  return true;
}

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}
