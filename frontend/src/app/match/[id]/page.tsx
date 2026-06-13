"use client";

import { use, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Flag } from "@/components/Flag";
import { EventIcon } from "@/components/icons";
import { DataUnavailable, Spinner, StatusBadge } from "@/components/ui";
import { REFRESH } from "@/lib/api";
import { formatKickoff, isLive } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import {
  STAGE_LABELS,
  type Lineup,
  type MatchDetails,
  type MatchEvent,
  type TeamStatistics,
} from "@/lib/types";

type Tab = "timeline" | "stats" | "lineups";

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: m, isLoading } = useApi<MatchDetails>(`/matches/${id}`, REFRESH.matchDetails);
  const [tab, setTab] = useState<Tab>("timeline");

  if (isLoading && !m) return <Spinner />;
  if (!m) return <p className="muted">Match not found.</p>;

  const live = isLive(m.status);

  return (
    <div className="space-y-6">
      <Link href="/fixtures" className="text-sm font-medium text-pitch-600">
        ← Back to fixtures
      </Link>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand to-pitch-600 px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">
          {STAGE_LABELS[m.stage]} {m.group ? `· Group ${m.group}` : m.round ? `· ${m.round}` : ""}
        </div>
        <div className="grid grid-cols-3 items-center gap-2 px-4 py-8 sm:px-8">
          <TeamSide name={m.homeTeam.name} flag={m.homeTeam.flag} teamId={m.homeTeam.id} />
          <div className="text-center">
            {m.status === "SCHEDULED" ? (
              <div>
                <p className="text-3xl font-bold">vs</p>
                <p className="muted mt-1 text-xs">{formatKickoff(m.utcDate)}</p>
              </div>
            ) : (
              <div>
                <p className="text-4xl font-extrabold tabular-nums sm:text-5xl">
                  {m.score.home ?? 0} <span className="text-slate-300">-</span> {m.score.away ?? 0}
                </p>
                {m.score.penalties && (
                  <p className="muted text-xs">
                    pens {m.score.penalties.home}-{m.score.penalties.away}
                  </p>
                )}
                <div className="mt-2 flex justify-center">
                  <StatusBadge status={m.status} minute={m.minute} />
                </div>
              </div>
            )}
          </div>
          <TeamSide name={m.awayTeam.name} flag={m.awayTeam.flag} teamId={m.awayTeam.id} />
        </div>
        {m.venue && (
          <div className="muted flex items-center justify-center gap-1.5 border-t border-slate-100 px-6 py-2 text-center text-xs dark:border-slate-800">
            <MapPin className="h-3.5 w-3.5" />
            {m.venue.name}{m.venue.city ? `, ${m.venue.city}` : ""}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {(["timeline", "stats", "lineups"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition ${
              tab === t ? "bg-white shadow dark:bg-slate-950" : "text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "timeline" && <Timeline events={m.events} home={m.homeTeam.id} live={live} />}
      {tab === "stats" && <Statistics stats={m.statistics} home={m.homeTeam.id} />}
      {tab === "lineups" && <Lineups lineups={m.lineups} home={m.homeTeam.id} away={m.awayTeam.id} />}
    </div>
  );
}

function TeamSide({ name, flag, teamId }: { name: string; flag: string; teamId: number }) {
  const inner = (
    <>
      <Flag flag={flag} size="text-5xl" />
      <span className="mt-2 text-center text-sm font-semibold sm:text-base">{name}</span>
    </>
  );
  return teamId ? (
    <Link href={`/team/${teamId}`} className="flex flex-col items-center transition hover:opacity-80">
      {inner}
    </Link>
  ) : (
    <div className="flex flex-col items-center">{inner}</div>
  );
}

function Timeline({ events, home, live }: { events: MatchEvent[]; home: number; live: boolean }) {
  if (events.length === 0) {
    return <DataUnavailable feature="Match events" />;
  }
  const sorted = [...events].sort((a, b) => b.minute - a.minute);
  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-800">
      {live && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-500">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" /> Updating live
        </div>
      )}
      {sorted.map((e, i) => {
        const isHome = e.teamId === home;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm ${isHome ? "" : "flex-row-reverse text-right"}`}
          >
            <span className="w-8 shrink-0 text-xs font-bold tabular-nums text-slate-400">
              {e.minute}'
            </span>
            <span className="flex w-5 justify-center">
              <EventIcon type={e.type} />
            </span>
            <div className={`min-w-0 flex-1 ${isHome ? "" : "text-right"}`}>
              <span className="font-medium">{e.player ?? e.detail ?? e.type.replace("_", " ")}</span>
              {e.assist && (
                <span className="muted block text-xs">
                  {e.type === "SUBSTITUTION" ? `↳ off: ${e.assist}` : `assist: ${e.assist}`}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Statistics({ stats, home }: { stats: TeamStatistics[]; home: number }) {
  if (stats.length < 2) return <DataUnavailable feature="Match statistics" />;
  const h = stats.find((s) => s.teamId === home) ?? stats[0];
  const a = stats.find((s) => s.teamId !== home) ?? stats[1];
  const rows: { label: string; key: keyof TeamStatistics; pct?: boolean }[] = [
    { label: "Possession", key: "possession", pct: true },
    { label: "Shots", key: "shots" },
    { label: "Shots on target", key: "shotsOnTarget" },
    { label: "Corners", key: "corners" },
    { label: "Fouls", key: "fouls" },
    { label: "Offsides", key: "offsides" },
    { label: "Saves", key: "saves" },
  ];
  return (
    <div className="card space-y-4 px-5 py-5">
      {rows.map((r) => {
        const hv = (h[r.key] as number) ?? 0;
        const av = (a[r.key] as number) ?? 0;
        const total = hv + av || 1;
        const hpct = r.pct ? hv : Math.round((hv / total) * 100);
        return (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-sm font-medium">
              <span className="tabular-nums">{hv}{r.pct ? "%" : ""}</span>
              <span className="muted text-xs">{r.label}</span>
              <span className="tabular-nums">{av}{r.pct ? "%" : ""}</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="bg-pitch-600" style={{ width: `${hpct}%` }} />
              <div className="bg-brand" style={{ width: `${100 - hpct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Lineups({ lineups, home, away }: { lineups: Lineup[]; home: number; away: number }) {
  if (lineups.length < 2) return <DataUnavailable feature="Lineups" />;
  const h = lineups.find((l) => l.teamId === home) ?? lineups[0];
  const a = lineups.find((l) => l.teamId === away) ?? lineups[1];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[h, a].map((l, idx) => (
        <div key={idx} className="card px-5 py-4">
          <p className="mb-3 text-sm font-semibold">
            Formation <span className="text-pitch-600">{l.formation ?? "—"}</span>
          </p>
          <p className="muted mb-1 text-xs font-semibold uppercase">Starting XI</p>
          <ul className="mb-4 space-y-1 text-sm">
            {l.startXI.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-6 text-right tabular-nums text-slate-400">{p.number}</span>
                <span>{p.name}</span>
                <span className="muted ml-auto text-xs">{p.position}</span>
              </li>
            ))}
          </ul>
          <p className="muted mb-1 text-xs font-semibold uppercase">Bench</p>
          <ul className="space-y-1 text-sm text-slate-500">
            {l.bench.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-6 text-right tabular-nums text-slate-400">{p.number}</span>
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
