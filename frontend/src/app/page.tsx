"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { MatchCard } from "@/components/MatchCard";
import { EmptyState, SectionTitle, Skeleton } from "@/components/ui";
import { REFRESH } from "@/lib/api";
import { dateKey, fullDate, isLive, TZ_LABEL } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { STAGE_LABELS, type Match, type Stage } from "@/lib/types";

export default function HomePage() {
  const { data: live } = useApi<Match[]>("/live", REFRESH.live);
  const { data: all, isLoading } = useApi<Match[]>("/matches");

  const { next, scheduleByDay, recent, stage } = useMemo(() => {
    const matches = all ?? [];
    const sorted = [...matches].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
    const next = sorted.find(
      (m) => m.status === "SCHEDULED" && new Date(m.utcDate).getTime() > Date.now(),
    );

    // Schedule = upcoming (not-yet-played) matches only, grouped by date.
    // Finished matches — including today's — appear under Recent Results instead.
    const groups = new Map<string, Match[]>();
    for (const m of sorted) {
      if (m.status !== "SCHEDULED") continue;
      const key = dateKey(m.utcDate);
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(m);
    }
    const scheduleByDay = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const recent = sorted
      .filter((m) => m.status === "FINISHED")
      .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
      .slice(0, 12);

    const liveStage = (live ?? [])[0]?.stage ?? next?.stage ?? "GROUP_STAGE";
    return { next, scheduleByDay, recent, stage: liveStage };
  }, [all, live]);

  const stagesOf = (matches: Match[]): string =>
    [...new Set(matches.map((m) => m.stage as Stage))].map((s) => STAGE_LABELS[s]).join(" · ");

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-pitch-600 to-pitch-500 px-6 py-10 text-white shadow-lg sm:px-10 sm:py-14">
        <Trophy className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 opacity-10" />
        <div className="relative max-w-2xl">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur">
            🇺🇸 🇨🇦 🇲🇽 · {STAGE_LABELS[stage]}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
            FIFA World Cup 2026
          </h1>
          <p className="mt-2 max-w-lg text-white/80">
            Live scores, fixtures, standings and the road to the final — all in real time.
          </p>

          <div className="mt-6">
            {next ? (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-white/70">
                  Next match · {next.homeTeam.name} vs {next.awayTeam.name}
                </p>
                <Countdown to={next.utcDate} />
              </div>
            ) : (
              <p className="text-white/80">The tournament schedule will appear here.</p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/fixtures"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-pitch-700 transition hover:bg-white/90"
            >
              All Fixtures
            </Link>
            <Link
              href="/standings"
              className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
            >
              Standings
            </Link>
          </div>
        </div>
      </section>

      {/* Live (top section) */}
      <section>
        <SectionTitle action={<Link href="/fixtures" className="text-sm font-medium text-pitch-600">View all →</Link>}>
          <span className="flex items-center gap-2">
            {live && live.length > 0 && <span className="live-dot h-2 w-2 rounded-full bg-red-500" />}
            Live Now
          </span>
        </SectionTitle>
        {live === undefined ? (
          <SkeletonGrid />
        ) : live.length === 0 ? (
          <EmptyState title="No matches are live right now" hint="See the full schedule below." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {/* Recent results — compact quarter-size cards */}
      {recent.length > 0 && (
        <section>
          <SectionTitle
            action={<Link href="/fixtures" className="text-sm font-medium text-pitch-600">All fixtures →</Link>}
          >
            Recent Results
          </SectionTitle>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {recent.map((m) => (
              <MatchCard key={m.id} match={m} compact />
            ))}
          </div>
        </section>
      )}

      {/* Full date-wise schedule */}
      <section>
        <SectionTitle
          action={
            <span className="text-xs font-medium text-slate-400">
              All times in Bangladesh time ({TZ_LABEL}, UTC+6)
            </span>
          }
        >
          Match Schedule
        </SectionTitle>

        {isLoading ? (
          <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-3 h-5 w-40" />
                <SkeletonGrid />
              </div>
            ))}
          </div>
        ) : scheduleByDay.length === 0 ? (
          <EmptyState title="The schedule will appear here once fixtures are published." />
        ) : (
          <div className="space-y-8">
            {scheduleByDay.map(([day, matches]) => (
              <div key={day}>
                <h3 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {fullDate(day)}
                  <span className="font-normal normal-case text-pitch-600">
                    · {stagesOf(matches)}
                  </span>
                  <span className="font-normal normal-case text-slate-400">
                    · {matches.length} {matches.length === 1 ? "match" : "matches"}
                  </span>
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {matches.map((m) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  );
}
