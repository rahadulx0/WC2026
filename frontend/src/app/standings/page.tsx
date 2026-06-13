"use client";

import Link from "next/link";
import { Flag } from "@/components/Flag";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { REFRESH } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { GroupStanding } from "@/lib/types";

export default function StandingsPage() {
  const { data, isLoading } = useApi<GroupStanding[]>("/standings", REFRESH.standings);

  return (
    <div>
      <PageHeader title="Standings" subtitle="Group tables · top 2 of each group + 8 best third-placed advance · auto-refreshes every 60s" />
      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState title="Standings not available yet" />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((g) => (
            <GroupTable key={g.group} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupTable({ group }: { group: GroupStanding }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-bold dark:border-slate-800">
        Group {group.group}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="muted text-xs">
            <th className="px-3 py-2 text-left font-medium">#</th>
            <th className="py-2 text-left font-medium">Team</th>
            <th className="px-1.5 py-2 text-center font-medium" title="Played">P</th>
            <th className="px-1.5 py-2 text-center font-medium" title="Won">W</th>
            <th className="px-1.5 py-2 text-center font-medium" title="Drawn">D</th>
            <th className="px-1.5 py-2 text-center font-medium" title="Lost">L</th>
            <th className="px-1.5 py-2 text-center font-medium" title="Goal difference">GD</th>
            <th className="px-3 py-2 text-center font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map((row) => (
            <tr
              key={row.team.id}
              className={`border-t border-slate-50 dark:border-slate-800/50 ${
                row.position <= 2 ? "bg-pitch-50/60 dark:bg-pitch-600/5" : ""
              }`}
            >
              <td className="px-3 py-2 text-slate-400">{row.position}</td>
              <td className="py-2">
                <Link href={`/team/${row.team.id}`} className="flex items-center gap-2 hover:text-pitch-600">
                  <Flag flag={row.team.flag} size="text-base" />
                  <span className="truncate font-medium">{row.team.code}</span>
                </Link>
              </td>
              <td className="px-1.5 py-2 text-center tabular-nums">{row.playedGames}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">{row.won}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">{row.draw}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">{row.lost}</td>
              <td className="px-1.5 py-2 text-center tabular-nums">
                {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </td>
              <td className="px-3 py-2 text-center font-bold tabular-nums">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
