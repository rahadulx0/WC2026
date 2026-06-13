"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { Chip, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { dateKey, fullDate, TZ_LABEL } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { STAGE_LABELS, type Match, type Stage } from "@/lib/types";

const FILTERS: { key: Stage | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "GROUP_STAGE", label: "Group Stage" },
  { key: "ROUND_OF_32", label: "Round of 32" },
  { key: "ROUND_OF_16", label: "Round of 16" },
  { key: "QUARTER_FINAL", label: "Quarter-finals" },
  { key: "SEMI_FINAL", label: "Semi-finals" },
  { key: "THIRD_PLACE", label: "Third Place" },
  { key: "FINAL", label: "Final" },
];

export default function FixturesPage() {
  const { data, isLoading } = useApi<Match[]>("/matches");
  const [filter, setFilter] = useState<Stage | "ALL">("ALL");

  const byDay = useMemo(() => {
    const matches = (data ?? []).filter((m) => filter === "ALL" || m.stage === filter);
    const groups = new Map<string, Match[]>();
    for (const m of matches.sort((a, b) => a.utcDate.localeCompare(b.utcDate))) {
      const day = dateKey(m.utcDate);
      (groups.get(day) ?? groups.set(day, []).get(day)!).push(m);
    }
    return [...groups.entries()];
  }, [data, filter]);

  return (
    <div>
      <PageHeader title="Fixtures" subtitle="Full match schedule by stage" />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : byDay.length === 0 ? (
        <EmptyState title="No fixtures in this stage yet" hint="Knockout matchups are confirmed once the group stage completes." />
      ) : (
        <div className="space-y-8">
          {byDay.map(([day, matches]) => (
            <div key={day}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {fullDate(day)}
                <span className="ml-2 font-normal text-slate-400">
                  · {STAGE_LABELS[matches[0].stage]} · times in {TZ_LABEL}
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
