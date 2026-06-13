"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { Flag } from "@/components/Flag";
import { MatchCard } from "@/components/MatchCard";
import { EmptyState, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { SearchResults } from "@/lib/types";

export default function SearchPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const q = useSearchParams().get("q") ?? "";
  const { data, isLoading } = useApi<SearchResults>(
    q ? `/search?q=${encodeURIComponent(q)}` : null,
  );

  const total = data
    ? data.teams.length + data.players.length + data.matches.length + data.venues.length
    : 0;

  return (
    <div className="space-y-8">
      <PageHeader title={`Search`} subtitle={q ? `Results for “${q}”` : "Type a query in the search bar"} />

      {!q ? (
        <EmptyState title="Search teams, players, matches and venues" />
      ) : isLoading ? (
        <Spinner />
      ) : total === 0 ? (
        <EmptyState title={`No results for “${q}”`} />
      ) : (
        <>
          {data!.teams.length > 0 && (
            <Section title="Teams">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data!.teams.map((t) => (
                  <Link key={t.id} href={`/team/${t.id}`} className="card flex items-center gap-3 px-4 py-3 hover:border-pitch-300">
                    <Flag flag={t.flag} size="text-2xl" />
                    <span className="font-medium">{t.name}</span>
                    {t.group && <span className="muted ml-auto text-xs">Group {t.group}</span>}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data!.players.length > 0 && (
            <Section title="Players">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data!.players.map((p) => (
                  <Link key={p.id} href={`/player/${p.id}`} className="card px-4 py-3 hover:border-pitch-300">
                    <p className="font-medium">{p.name}</p>
                    <p className="muted text-xs">{p.teamName} · {p.position}</p>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {data!.matches.length > 0 && (
            <Section title="Matches">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data!.matches.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </Section>
          )}

          {data!.venues.length > 0 && (
            <Section title="Venues">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data!.venues.map((v) => (
                  <div key={v.id} className="card px-4 py-3">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Building2 className="h-4 w-4 text-pitch-600" /> {v.name}
                    </p>
                    <p className="muted text-xs">{v.city}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
