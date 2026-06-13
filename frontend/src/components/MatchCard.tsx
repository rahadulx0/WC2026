import Link from "next/link";
import { MapPin } from "lucide-react";
import type { Match } from "@/lib/types";
import { formatTime, isLive, shortDate, statusLabel } from "@/lib/format";
import { Flag } from "./Flag";

export function MatchCard({
  match,
  showVenue = true,
  compact = false,
}: {
  match: Match;
  showVenue?: boolean;
  compact?: boolean;
}) {
  const live = isLive(match.status);
  const finished = match.status === "FINISHED";
  const showScore = live || finished;
  const homeWin = finished && (match.score.home ?? 0) > (match.score.away ?? 0);
  const awayWin = finished && (match.score.away ?? 0) > (match.score.home ?? 0);

  // Compact variant — quarter-size result cards (no header/footer chrome).
  if (compact) {
    return (
      <Link
        href={`/match/${match.id}`}
        className="card block px-3 py-2.5 transition active:scale-[0.97] hover:border-pitch-300 dark:hover:border-pitch-700"
      >
        <div className="space-y-1.5">
          <TeamRow team={match.homeTeam.code || match.homeTeam.name} flag={match.homeTeam.flag} score={match.score.home} show={showScore} winner={homeWin} dim={awayWin} small />
          <TeamRow team={match.awayTeam.code || match.awayTeam.name} flag={match.awayTeam.flag} score={match.score.away} show={showScore} winner={awayWin} dim={homeWin} small />
        </div>
        <p className="mt-1.5 text-right text-[10px] font-medium text-slate-400">
          {live ? statusLabel(match.status, match.minute) : finished ? "FT" : `${shortDate(match.utcDate)} · ${formatTime(match.utcDate)}`}
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={`/match/${match.id}`}
      className="card group relative block px-4 py-3 transition active:scale-[0.99] hover:-translate-y-0.5 hover:border-pitch-300 hover:shadow-md dark:hover:border-pitch-700"
    >
      {/* Header: status / kickoff time */}
      <div className="mb-2.5 flex items-center justify-end text-[11px]">
        {live ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            {statusLabel(match.status, match.minute)}
          </span>
        ) : finished ? (
          <span className="font-semibold text-slate-400">Full time</span>
        ) : (
          <span className="font-medium text-slate-500">
            {shortDate(match.utcDate)} · {formatTime(match.utcDate)}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <TeamRow team={match.homeTeam.name} flag={match.homeTeam.flag} score={match.score.home} show={showScore} winner={homeWin} dim={awayWin} />
        <TeamRow team={match.awayTeam.name} flag={match.awayTeam.flag} score={match.score.away} show={showScore} winner={awayWin} dim={homeWin} />
      </div>

      {/* Footer: stadium + location */}
      {showVenue && match.venue?.name && (
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-slate-800">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {match.venue.name}
            {match.venue.city ? `, ${match.venue.city}` : ""}
          </span>
        </div>
      )}
    </Link>
  );
}

function TeamRow({
  team,
  flag,
  score,
  show,
  winner,
  dim,
  small = false,
}: {
  team: string;
  flag: string;
  score: number | null;
  show: boolean;
  winner: boolean;
  dim: boolean;
  small?: boolean;
}) {
  return (
    <div className={`flex items-center ${small ? "gap-2" : "gap-2.5"} ${dim ? "opacity-60" : ""}`}>
      <Flag flag={flag} size={small ? "text-base" : "text-xl"} />
      <span
        className={`min-w-0 flex-1 truncate ${small ? "text-xs" : "text-sm"} ${
          winner ? "font-bold" : "font-medium"
        }`}
      >
        {team}
      </span>
      {show && (
        <span
          className={`text-center tabular-nums ${small ? "w-5 text-sm" : "w-6 text-base"} ${
            winner ? "font-extrabold text-pitch-600" : "font-semibold"
          }`}
        >
          {score ?? 0}
        </span>
      )}
    </div>
  );
}
