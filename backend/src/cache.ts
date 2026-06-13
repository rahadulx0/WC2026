// ── In-memory cache (no database) ────────────────────────────────────────────
// Wraps node-cache with the per-resource TTLs from the plan. Also collapses
// concurrent identical requests so a cache miss only triggers one upstream call.

import NodeCache from "node-cache";

const store = new NodeCache({ checkperiod: 30, useClones: false });
const inflight = new Map<string, Promise<unknown>>();

// TTLs in seconds, per the plan's caching strategy.
export const TTL = {
  live: 15,
  standings: 60,
  fixtures: 30 * 60,
  teams: 24 * 60 * 60,
  venues: 24 * 60 * 60,
  matchDetails: 15,
  players: 60 * 60,
  bracket: 60,
  leaderboard: 5 * 60,
  search: 60,
} as const;

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const hit = store.get<T>(key);
  if (hit !== undefined) return hit;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    try {
      const value = await producer();
      store.set(key, value, ttlSeconds);
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

export function cacheStats() {
  return { ...store.getStats(), keys: store.keys().length };
}

export function flushCache() {
  store.flushAll();
}
