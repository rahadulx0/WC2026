"use client";

import { use } from "react";
import Link from "next/link";
import { Goal } from "lucide-react";
import { Flag } from "@/components/Flag";
import { MatchCard } from "@/components/MatchCard";
import { Spinner } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { Player, PlayerPosition, TeamDetails } from "@/lib/types";

const POSITION_ORDER: PlayerPosition[] = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

export default function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: t, isLoading } = useApi<TeamDetails>(`/teams/${id}`);

  if (isLoading && !t) return <Spinner />;
  if (!t) return <p className="muted">Team not found.</p>;

  const upcoming = t.fixtures.filter((m) => m.status === "SCHEDULED");
  const played = t.fixtures.filter((m) => m.status !== "SCHEDULED");

  return (
    <div className="space-y-8">
      <Link href="/teams" className="text-sm font-medium text-pitch-600">← All teams</Link>

      {/* Overview */}
      <div className="card flex flex-wrap items-center gap-5 px-6 py-6">
        <Flag flag={t.flag} size="text-6xl" />
        <div>
          <h1 className="text-3xl font-bold">{t.name}</h1>
          <p className="muted mt-1 text-sm">
            {t.group && `Group ${t.group}`}
            {t.coach && ` · Coach: ${t.coach}`}
            {t.ranking && ` · FIFA Rank #${t.ranking}`}
          </p>
        </div>
        <div className="ml-auto grid grid-cols-3 gap-4 text-center">
          <Stat label="W" value={t.stats.wins} />
          <Stat label="D" value={t.stats.draws} />
          <Stat label="L" value={t.stats.losses} />
          <Stat label="GF" value={t.stats.goalsFor} />
          <Stat label="GA" value={t.stats.goalsAgainst} />
          <Stat label="GD" value={t.stats.goalsFor - t.stats.goalsAgainst} />
        </div>
      </div>

      {/* Squad */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Squad</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POSITION_ORDER.map((pos) => {
            const players = t.squad.filter((p) => p.position === pos);
            if (!players.length) return null;
            return (
              <div key={pos} className="card px-4 py-3">
                <h3 className="muted mb-2 text-xs font-semibold uppercase">{pos}s</h3>
                <ul className="space-y-1 text-sm">
                  {players.map((p) => (
                    <PlayerRow key={p.id} player={p} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Fixtures */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Upcoming</h2>
          <div className="space-y-3">
            {upcoming.length ? upcoming.map((m) => <MatchCard key={m.id} match={m} />) : <p className="muted text-sm">No upcoming matches.</p>}
          </div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Results</h2>
          <div className="space-y-3">
            {played.length ? played.map((m) => <MatchCard key={m.id} match={m} />) : <p className="muted text-sm">No matches played yet.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="muted text-xs">{label}</p>
    </div>
  );
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <li>
      <Link href={`/player/${player.id}`} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-slate-50 dark:hover:bg-slate-800">
        <span className="w-5 text-right text-xs text-slate-400">{player.number}</span>
        <span className="truncate">{player.name}</span>
        {(player.stats?.goals ?? 0) > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-xs">
            <Goal className="h-3.5 w-3.5 text-pitch-600" />
            {player.stats?.goals}
          </span>
        )}
      </Link>
    </li>
  );
}
