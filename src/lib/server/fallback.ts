import "server-only";
import { ApiError } from "./errors";

const OUTAGE = new Set(["UNAVAILABLE", "SERVICE_FAILURE", "TIMEOUT", "NOT_CONFIGURED"]);

/**
 * Try the primary provider; if it is down (not if the input was wrong), try the
 * backup. Returns which source answered so responses can credit it.
 */
export async function withFallback<T>(
  primary: { source: string; run: () => Promise<T> },
  backup?: { source: string; run: () => Promise<T>; enabled: boolean },
): Promise<{ data: T; source: string }> {
  try {
    return { data: await primary.run(), source: primary.source };
  } catch (err) {
    if (!backup?.enabled || !(err instanceof ApiError) || !OUTAGE.has(err.code)) throw err;
    console.warn(`[fallback] ${primary.source} failed (${err.code}); trying ${backup.source}`);
    try {
      return { data: await backup.run(), source: backup.source };
    } catch {
      throw err;
    }
  }
}
