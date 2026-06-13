"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { BarChart3, CircleCheck, Goal, Handshake, Radio } from "lucide-react";
import { PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { Match, Player } from "@/lib/types";

export default function StatsPage() {
  const { data: scorers } = useApi<Player[]>("/leaderboards/scorers");
  const { data: assists } = useApi<Player[]>("/leaderboards/assists");
  const { data: matches } = useApi<Match[]>("/matches");

  const agg = useMemo(() => {
    const finished = (matches ?? []).filter((m) => m.status === "FINISHED");
    const goals = finished.reduce(
      (sum, m) => sum + (m.score.home ?? 0) + (m.score.away ?? 0),
      0,
    );
    const live = (matches ?? []).filter((m) => m.status === "LIVE" || m.status === "HALFTIME").length;
    return {
      played: finished.length,
      goals,
      avg: finished.length ? (goals / finished.length).toFixed(2) : "0",
      live,
    };
  }, [matches]);

  return (
    <div className="space-y-8">
      <PageHeader title="Tournament Stats" subtitle="Leaderboards and aggregate numbers" />

      {/* Aggregate cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Big label="Matches played" value={agg.played} icon={<CircleCheck className="h-7 w-7 text-pitch-600" />} />
        <Big label="Goals scored" value={agg.goals} icon={<Goal className="h-7 w-7 text-pitch-600" />} />
        <Big label="Goals / match" value={agg.avg} icon={<BarChart3 className="h-7 w-7 text-brand" />} />
        <Big label="Live now" value={agg.live} icon={<Radio className="h-7 w-7 text-red-500" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Leaderboard title="Top Scorers" players={scorers} statKey="goals" icon={<Goal className="h-5 w-5 text-pitch-600" />} />
        <Leaderboard title="Top Assists" players={assists} statKey="assists" icon={<Handshake className="h-5 w-5 text-brand" />} />
      </div>
    </div>
  );
}

function Big({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return (
    <div className="card flex items-center gap-3 px-4 py-4">
      <span>{icon}</span>
      <div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="muted text-xs">{label}</p>
      </div>
    </div>
  );
}

function Leaderboard({
  title,
  players,
  statKey,
  icon,
}: {
  title: string;
  players?: Player[];
  statKey: "goals" | "assists";
  icon: ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        {icon} {title}
      </h2>
      {!players ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {players.slice(0, 12).map((p, i) => (
            <Link
              key={p.id}
              href={`/player/${p.id}`}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span className="w-5 text-center font-bold text-slate-400">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{p.name}</span>
                <span className="muted block text-xs">{p.teamName}</span>
              </span>
              <span className="text-lg font-bold tabular-nums">{p.stats?.[statKey] ?? 0}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
