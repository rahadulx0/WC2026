// Mirrors the backend's normalized domain model (the API contract).
export type MatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "HALFTIME"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

export type Stage =
  | "GROUP_STAGE"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

export const STAGE_LABELS: Record<Stage, string> = {
  GROUP_STAGE: "Group Stage",
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTER_FINAL: "Quarter-finals",
  SEMI_FINAL: "Semi-finals",
  THIRD_PLACE: "Third-place",
  FINAL: "Final",
};

export interface TeamRef {
  id: number;
  name: string;
  code: string;
  flag: string;
  group?: string;
}

export interface Score {
  home: number | null;
  away: number | null;
  halftime?: { home: number | null; away: number | null };
  penalties?: { home: number | null; away: number | null };
}

export interface Venue {
  id: number;
  name: string;
  city: string;
  country?: string;
  capacity?: number;
  matchesHosted?: number;
}

export type EventType =
  | "GOAL"
  | "PENALTY_GOAL"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "RED_CARD"
  | "SUBSTITUTION"
  | "VAR";

export interface MatchEvent {
  minute: number;
  extra?: number;
  type: EventType;
  teamId: number;
  player?: string;
  assist?: string;
  detail?: string;
}

export interface TeamStatistics {
  teamId: number;
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
  corners?: number;
  fouls?: number;
  offsides?: number;
  saves?: number;
}

export interface LineupPlayer {
  number: number;
  name: string;
  position: string;
}

export interface Lineup {
  teamId: number;
  formation?: string;
  startXI: LineupPlayer[];
  bench: LineupPlayer[];
}

export interface Match {
  id: number;
  status: MatchStatus;
  minute: number | null;
  utcDate: string;
  stage: Stage;
  group?: string;
  round?: string;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score: Score;
  venue?: Venue;
}

export interface MatchDetails extends Match {
  events: MatchEvent[];
  statistics: TeamStatistics[];
  lineups: Lineup[];
}

export interface StandingRow {
  position: number;
  team: TeamRef;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupStanding {
  group: string;
  table: StandingRow[];
}

export type PlayerPosition = "Goalkeeper" | "Defender" | "Midfielder" | "Forward";

export interface PlayerStats {
  appearances?: number;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
  minutesPlayed?: number;
}

export interface Player {
  id: number;
  name: string;
  teamId: number;
  teamName: string;
  position: PlayerPosition;
  number?: number;
  nationality?: string;
  stats?: PlayerStats;
}

export interface TeamDetails extends TeamRef {
  coach?: string;
  ranking?: number;
  venueName?: string;
  squad: Player[];
  stats: {
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  fixtures: Match[];
}

export interface BracketTie {
  id: string;
  round: Stage;
  matchId?: number;
  status: MatchStatus;
  home?: TeamRef;
  away?: TeamRef;
  homeScore?: number | null;
  awayScore?: number | null;
  penalties?: { home: number | null; away: number | null };
}

export interface BracketRound {
  round: Stage;
  ties: BracketTie[];
}

export interface SearchResults {
  teams: TeamRef[];
  players: Player[];
  matches: Match[];
  venues: Venue[];
}
