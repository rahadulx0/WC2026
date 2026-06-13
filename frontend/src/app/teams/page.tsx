"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Flag } from "@/components/Flag";
import { PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { TeamRef } from "@/lib/types";

export default function TeamsPage() {
  const { data, isLoading } = useApi<TeamRef[]>("/teams");

  const byGroup = useMemo(() => {
    const groups = new Map<string, TeamRef[]>();
    for (const t of data ?? []) {
      const g = t.group ?? "—";
      (groups.get(g) ?? groups.set(g, []).get(g)!).push(t);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  return (
    <div>
      <PageHeader title="Teams" subtitle="48 nations across 12 groups" />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {byGroup.map(([group, teams]) => (
            <div key={group} className="card px-4 py-3">
              <h2 className="mb-2 text-sm font-bold">Group {group}</h2>
              <ul className="space-y-1">
                {teams.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/team/${t.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Flag flag={t.flag} size="text-xl" />
                      <span className="font-medium">{t.name}</span>
                      <span className="muted ml-auto text-xs">{t.code}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
