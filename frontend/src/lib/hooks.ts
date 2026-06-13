"use client";

import useSWR from "swr";
import { fetcher } from "./api";

// Thin SWR wrapper so pages just declare a path + refresh interval.
export function useApi<T>(path: string | null, refreshMs = 0) {
  return useSWR<T>(path, fetcher, {
    refreshInterval: refreshMs,
    revalidateOnFocus: refreshMs > 0,
    keepPreviousData: true,
  });
}
