// API client + SWR fetcher. Works in both server components (absolute URL) and
// client components (SWR hooks with the plan's refresh intervals).

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";

export async function fetcher<T>(path: string): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

// Refresh intervals (ms) matching the plan's live-data cadence.
export const REFRESH = {
  live: 15_000,
  matchDetails: 15_000,
  standings: 60_000,
  bracket: 60_000,
  none: 0,
} as const;
