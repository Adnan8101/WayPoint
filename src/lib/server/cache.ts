import "server-only";

interface Entry<T> {
  value: T;
  fetchedAt: number;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<Entry<unknown>>>();
const MAX_ENTRIES = 2000;

/**
 * In-memory TTL cache with in-flight request de-duplication: concurrent
 * identical requests share one upstream call. For multi-instance deployments
 * swap this for Redis or a similar shared store.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<{ value: T; fetchedAt: number; cached: boolean }> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return { value: hit.value, fetchedAt: hit.fetchedAt, cached: true };

  let pending = inflight.get(key) as Promise<Entry<T>> | undefined;
  const shared = Boolean(pending);
  if (!pending) {
    pending = load().then((value) => {
      const entry = { value, fetchedAt: Date.now(), expires: Date.now() + ttlMs };
      if (ttlMs > 0) {
        if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value as string);
        store.set(key, entry);
      }
      return entry;
    });
    inflight.set(key, pending);
    pending.finally(() => inflight.delete(key)).catch(() => {});
  }
  const entry = await pending;
  return { value: entry.value, fetchedAt: entry.fetchedAt, cached: shared };
}
