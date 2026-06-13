"use client";

import Link from "next/link";
import { Flag } from "@/components/Flag";
import { EmptyState, PageHeader, Spinner } from "@/components/ui";
import { REFRESH } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { STAGE_LABELS, type BracketRound, type BracketTie } from "@/lib/types";

export default function BracketPage() {
  const { data, isLoading } = useApi<BracketRound[]>("/bracket", REFRESH.bracket);

  if (isLoading) return <Spinner />;
  if (!data || data.length === 0)
    return (
      <div>
        <PageHeader title="Knockout Bracket" />
        <EmptyState title="The bracket fills in as the group stage completes" />
      </div>
    );

  return (
    <div>
      <PageHeader
        title="Knockout Bracket"
        subtitle="Fixtures run through to the final — teams fill in automatically as they qualify."
      />
      <div className="flex gap-5 overflow-x-auto pb-4">
        {data.map((round) => (
          <div key={round.round} className="flex min-w-[220px] flex-col">
            <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
              {STAGE_LABELS[round.round]}
            </h2>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.ties.map((tie) => (
                <Tie key={tie.id} tie={tie} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tie({ tie }: { tie: BracketTie }) {
  const decided = tie.status === "FINISHED";
  const card = (
    <div className="card overflow-hidden text-sm">
      <Row team={tie.home?.name} flag={tie.home?.flag} score={tie.homeScore} decided={decided} winner={decided && (tie.homeScore ?? 0) > (tie.awayScore ?? 0)} />
      <div className="border-t border-slate-100 dark:border-slate-800" />
      <Row team={tie.away?.name} flag={tie.away?.flag} score={tie.awayScore} decided={decided} winner={decided && (tie.awayScore ?? 0) > (tie.homeScore ?? 0)} />
    </div>
  );
  return tie.matchId ? (
    <Link href={`/match/${tie.matchId}`} className="block transition hover:opacity-90">
      {card}
    </Link>
  ) : (
    card
  );
}

function Row({
  team,
  flag,
  score,
  decided,
  winner,
}: {
  team?: string;
  flag?: string;
  score?: number | null;
  decided: boolean;
  winner: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${winner ? "font-bold" : ""}`}>
      <Flag flag={flag ?? "🏳️"} size="text-base" />
      <span className="min-w-0 flex-1 truncate">{team ?? "TBD"}</span>
      {decided && <span className="tabular-nums">{score ?? 0}</span>}
    </div>
  );
}
