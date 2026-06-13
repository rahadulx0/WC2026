// ── TheSportsDB provider ─────────────────────────────────────────────────────
// Real FIFA World Cup 2026 data from the free TheSportsDB API. The full schedule
// is assembled from per-round endpoints; groups, standings, teams, venues and the
// knockout bracket are all DERIVED from those real fixtures (no fabricated data).

import { cached, TTL } from "../cache.js";
import { config } from "../config.js";
import type {
  BracketRound,
  BracketTie,
  EventType,
  FootballProvider,
  GroupStanding,
  Match,
  MatchDetails,
  MatchEvent,
  MatchQuery,
  MatchStatus,
  Player,
  PlayerPosition,
  SearchResults,
  Stage,
  StandingRow,
  TeamDetails,
  TeamRef,
  TeamStatistics,
  Venue,
} from "./types.js";

// TheSportsDB intRound → tournament stage.
const ROUND_STAGE: Record<number, Stage> = {
  1: "GROUP_STAGE",
  2: "GROUP_STAGE",
  3: "GROUP_STAGE",
  32: "ROUND_OF_32",
  16: "ROUND_OF_16",
  125: "QUARTER_FINAL",
  150: "SEMI_FINAL",
  160: "THIRD_PLACE",
  200: "FINAL",
};
const ROUNDS = Object.keys(ROUND_STAGE).map(Number);

function statusFrom(raw: string | null, hasScore: boolean): MatchStatus {
  const s = (raw || "").toUpperCase();
  if (["1H", "2H", "ET", "BT", "P", "LIVE", "INPLAY"].includes(s)) return "LIVE";
  if (s === "HT") return "HALFTIME";
  if (["FT", "AET", "PEN", "MATCH FINISHED", "FINISHED"].includes(s)) return "FINISHED";
  if (s.startsWith("POSTP") || s === "PPD") return "POSTPONED";
  if (s.startsWith("CANC")) return "CANCELLED";
  if (s === "NS" || s === "NOT STARTED" || s === "") {
    return hasScore ? "FINISHED" : "SCHEDULED";
  }
  return hasScore ? "FINISHED" : "SCHEDULED";
}

function toUtcIso(ev: any): string {
  let ts: string | null = ev.strTimestamp;
  if (ts) {
    if (!/[zZ]|[+-]\d\d:?\d\d$/.test(ts)) ts += "Z";
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const date = ev.dateEvent || "1970-01-01";
  const time = ev.strTime && ev.strTime !== "00:00:00" ? ev.strTime : "12:00:00";
  const d = new Date(`${date}T${time}Z`);
  return isNaN(d.getTime()) ? `${date}T12:00:00.000Z` : d.toISOString();
}

function codeFromName(name: string): string {
  const words = (name || "").trim().split(/\s+/);
  if (words.length >= 2) return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return (name || "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

function normalizePosition(pos: string): PlayerPosition {
  const p = (pos || "").toLowerCase();
  if (p.includes("keeper") || p === "g" || p.includes("goal")) return "Goalkeeper";
  if (p.includes("back") || p.includes("defen") || p === "d") return "Defender";
  if (p.includes("mid") || p === "m") return "Midfielder";
  if (p.includes("forward") || p.includes("strik") || p.includes("wing") || p.includes("attack") || p === "f")
    return "Forward";
  return "Midfielder";
}

function eventType(kind: string, detail: string): EventType {
  const k = (kind || "").toLowerCase();
  const d = (detail || "").toLowerCase();
  if (k.includes("own")) return "OWN_GOAL";
  if (k.includes("penalty") && k.includes("goal")) return "PENALTY_GOAL";
  if (k === "goal" || k.includes("goal")) return d.includes("pen") ? "PENALTY_GOAL" : "GOAL";
  if (k.includes("yellow")) return "YELLOW_CARD";
  if (k.includes("red")) return "RED_CARD";
  if (k.includes("subst")) return "SUBSTITUTION";
  if (k.includes("var")) return "VAR";
  return "GOAL";
}

interface Dataset {
  matches: Match[];
  teams: TeamRef[];
  groupByTeam: Record<number, string>;
}

export class TheSportsDbProvider implements FootballProvider {
  readonly name = "thesportsdb";
  private base = `${config.theSportsDb.base}/${config.theSportsDb.key}`;
  private league = config.theSportsDb.leagueId;
  private season = config.theSportsDb.season;

  private async get(path: string): Promise<any | null> {
    try {
      const res = await fetch(`${this.base}${path}`);
      if (!res.ok) {
        console.warn(`[thesportsdb] HTTP ${res.status} for ${path}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn(`[thesportsdb] fetch failed for ${path}:`, (err as Error).message);
      return null;
    }
  }

  private teamRef(id: any, name: string, badge?: string): TeamRef {
    return {
      id: Number(id) || 0,
      name: name || "TBD",
      code: codeFromName(name),
      flag: badge || "🏳️",
    };
  }

  private mapEvent(ev: any): Match {
    const round = Number(ev.intRound);
    const stage = ROUND_STAGE[round] ?? "GROUP_STAGE";
    const homeScore = ev.intHomeScore != null && ev.intHomeScore !== "" ? Number(ev.intHomeScore) : null;
    const awayScore = ev.intAwayScore != null && ev.intAwayScore !== "" ? Number(ev.intAwayScore) : null;
    const status = statusFrom(ev.strStatus, homeScore != null);
    return {
      id: Number(ev.idEvent),
      status,
      minute: ev.strProgress ? Number(String(ev.strProgress).replace(/\D/g, "")) || null : null,
      utcDate: toUtcIso(ev),
      stage,
      round: ev.strRound || undefined,
      homeTeam: this.teamRef(ev.idHomeTeam, ev.strHomeTeam, ev.strHomeTeamBadge),
      awayTeam: this.teamRef(ev.idAwayTeam, ev.strAwayTeam, ev.strAwayTeamBadge),
      score: { home: homeScore, away: awayScore },
      venue: ev.strVenue ? { id: 0, name: ev.strVenue, city: ev.strCity || "" } : undefined,
    };
  }

  // ── Core dataset: full schedule + derived groups + team list (cached) ──────
  private dataset(): Promise<Dataset> {
    return cached("tsdb:dataset", TTL.fixtures, async () => {
      const rounds = await Promise.all(
        ROUNDS.map((r) =>
          this.get(`/eventsround.php?id=${this.league}&r=${r}&s=${this.season}`),
        ),
      );
      const events = rounds.flatMap((res) => (res?.events as any[]) ?? []);
      const realMatches = events.filter((e) => e.idEvent).map((e) => this.mapEvent(e));

      // The data source only publishes knockout fixtures once teams qualify.
      // Until a knockout round has real fixtures, inject a scheduled placeholder
      // skeleton (real round dates, "TBD" teams) so the schedule runs to the
      // final. Real fixtures supersede the skeleton automatically per round, so
      // teams fill in as soon as the source has them.
      const realStages = new Set(realMatches.map((m) => m.stage));
      const skeleton = knockoutSkeleton().filter((m) => !realStages.has(m.stage));
      const matches = [...realMatches, ...skeleton].sort((a, b) =>
        a.utcDate.localeCompare(b.utcDate),
      );

      const groupByTeam = deriveGroups(matches);

      // Stamp the derived group onto every team reference.
      for (const m of matches) {
        if (groupByTeam[m.homeTeam.id]) m.homeTeam.group = groupByTeam[m.homeTeam.id];
        if (groupByTeam[m.awayTeam.id]) m.awayTeam.group = groupByTeam[m.awayTeam.id];
      }

      // Unique team list.
      const teamMap = new Map<number, TeamRef>();
      for (const m of matches) {
        for (const t of [m.homeTeam, m.awayTeam]) {
          if (t.id && !teamMap.has(t.id)) teamMap.set(t.id, { ...t });
        }
      }
      const teams = [...teamMap.values()].sort(
        (a, b) => (a.group ?? "Z").localeCompare(b.group ?? "Z") || a.name.localeCompare(b.name),
      );

      return { matches, teams, groupByTeam };
    });
  }

  // ── FootballProvider ───────────────────────────────────────────────────────
  async getLiveMatches(): Promise<Match[]> {
    const { matches } = await this.dataset();
    return matches.filter((m) => m.status === "LIVE" || m.status === "HALFTIME");
  }

  async getMatches(query: MatchQuery = {}): Promise<Match[]> {
    let { matches } = await this.dataset();
    if (query.stage) matches = matches.filter((m) => m.stage === query.stage);
    if (query.status) matches = matches.filter((m) => m.status === query.status);
    if (query.teamId)
      matches = matches.filter(
        (m) => m.homeTeam.id === query.teamId || m.awayTeam.id === query.teamId,
      );
    if (query.date) matches = matches.filter((m) => m.utcDate.slice(0, 10) === query.date);
    if (query.from) matches = matches.filter((m) => m.utcDate >= query.from!);
    if (query.to) matches = matches.filter((m) => m.utcDate <= query.to!);
    if (query.limit) matches = matches.slice(0, query.limit);
    return matches;
  }

  async getMatchDetails(id: number): Promise<MatchDetails | null> {
    const { matches } = await this.dataset();
    let base = matches.find((m) => m.id === id);

    // Placeholder knockout fixture (teams TBD) — nothing to fetch yet.
    if (base && base.homeTeam.id === 0 && base.awayTeam.id === 0) {
      return { ...base, events: [], statistics: [], lineups: [] };
    }

    if (!base) {
      const ev = await this.get(`/lookupevent.php?id=${id}`);
      const raw = ev?.events?.[0];
      if (!raw) return null;
      base = this.mapEvent(raw);
    }

    const [timelineRes, lineupRes, statsRes] = await Promise.all([
      this.get(`/lookuptimeline.php?id=${id}`),
      this.get(`/lookuplineup.php?id=${id}`),
      this.get(`/lookupeventstats.php?id=${id}`),
    ]);

    const events: MatchEvent[] = ((timelineRes?.timeline as any[]) ?? [])
      .map((t): MatchEvent => ({
        minute: Number(t.intTime) || 0,
        type: eventType(t.strTimeline, t.strTimelineDetail),
        teamId: Number(t.idTeam) || (t.strHome === "Yes" ? base!.homeTeam.id : base!.awayTeam.id),
        player: t.strPlayer || undefined,
        assist: t.strAssist || undefined,
        detail: t.strTimelineDetail || undefined,
      }))
      .sort((a, b) => a.minute - b.minute);

    const statistics: TeamStatistics[] = mapStats(statsRes?.eventstats, base.homeTeam.id, base.awayTeam.id);

    const lineups = mapLineups(lineupRes?.lineup, base.homeTeam.id, base.awayTeam.id);

    return { ...base, events, statistics, lineups };
  }

  async getStandings(): Promise<GroupStanding[]> {
    const { matches, teams, groupByTeam } = await this.dataset();
    const groups = [...new Set(Object.values(groupByTeam))].sort();
    if (groups.length === 0) return [];

    return groups.map((group): GroupStanding => {
      const groupTeams = teams.filter((t) => t.group === group);
      const rows = new Map<number, StandingRow>();
      for (const t of groupTeams) {
        rows.set(t.id, {
          position: 0,
          team: t,
          playedGames: 0,
          won: 0,
          draw: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        });
      }
      for (const m of matches) {
        if (m.stage !== "GROUP_STAGE" || m.status !== "FINISHED") continue;
        const h = rows.get(m.homeTeam.id);
        const a = rows.get(m.awayTeam.id);
        if (!h || !a) continue;
        const hs = m.score.home ?? 0;
        const as = m.score.away ?? 0;
        h.playedGames++; a.playedGames++;
        h.goalsFor += hs; h.goalsAgainst += as;
        a.goalsFor += as; a.goalsAgainst += hs;
        if (hs > as) { h.won++; h.points += 3; a.lost++; }
        else if (hs < as) { a.won++; a.points += 3; h.lost++; }
        else { h.draw++; a.draw++; h.points++; a.points++; }
      }
      const table = [...rows.values()]
        .map((r) => ({ ...r, goalDifference: r.goalsFor - r.goalsAgainst }))
        .sort(
          (x, y) =>
            y.points - x.points ||
            y.goalDifference - x.goalDifference ||
            y.goalsFor - x.goalsFor ||
            x.team.name.localeCompare(y.team.name),
        )
        .map((r, i) => ({ ...r, position: i + 1 }));
      return { group, table };
    });
  }

  async getTeams(): Promise<TeamRef[]> {
    return (await this.dataset()).teams;
  }

  async getTeam(id: number): Promise<TeamDetails | null> {
    const { teams, matches } = await this.dataset();
    const ref = teams.find((t) => t.id === id);
    const fixtures = matches.filter((m) => m.homeTeam.id === id || m.awayTeam.id === id);
    if (!ref && fixtures.length === 0) return null;

    const [teamRes, squadRes] = await Promise.all([
      this.get(`/lookupteam.php?id=${id}`),
      this.get(`/lookup_all_players.php?id=${id}`),
    ]);
    const info = teamRes?.teams?.[0];
    const squad: Player[] = ((squadRes?.player as any[]) ?? []).map((p): Player => ({
      id: Number(p.idPlayer),
      name: p.strPlayer,
      teamId: id,
      teamName: ref?.name ?? info?.strTeam ?? "",
      position: normalizePosition(p.strPosition),
      number: p.strNumber ? Number(p.strNumber) : undefined,
      nationality: p.strNationality,
    }));

    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    for (const f of fixtures) {
      if (f.status !== "FINISHED") continue;
      const isHome = f.homeTeam.id === id;
      const gf = (isHome ? f.score.home : f.score.away) ?? 0;
      const ga = (isHome ? f.score.away : f.score.home) ?? 0;
      goalsFor += gf; goalsAgainst += ga;
      if (gf > ga) wins++; else if (gf === ga) draws++; else losses++;
    }

    return {
      ...(ref ?? this.teamRef(id, info?.strTeam ?? "", info?.strBadge)),
      coach: info?.strManager || undefined,
      ranking: undefined,
      venueName: info?.strStadium || undefined,
      squad,
      stats: { wins, draws, losses, goalsFor, goalsAgainst },
      fixtures,
    };
  }

  async getPlayers(query: { search?: string; teamId?: number } = {}): Promise<Player[]> {
    if (query.teamId) {
      const res = await this.get(`/lookup_all_players.php?id=${query.teamId}`);
      return ((res?.player as any[]) ?? []).map((p) => mapTsdbPlayer(p));
    }
    const q = query.search?.trim();
    if (!q || q.length < 3) return [];
    const res = await this.get(`/searchplayers.php?p=${encodeURIComponent(q)}`);
    return ((res?.player as any[]) ?? [])
      .filter((p) => (p.strSport ?? "Soccer") === "Soccer")
      .slice(0, 30)
      .map((p) => mapTsdbPlayer(p));
  }

  async getPlayer(id: number): Promise<Player | null> {
    const res = await this.get(`/lookupplayer.php?id=${id}`);
    const p = res?.players?.[0];
    return p ? mapTsdbPlayer(p) : null;
  }

  async getVenues(): Promise<Venue[]> {
    const { matches } = await this.dataset();
    const map = new Map<string, Venue>();
    for (const m of matches) {
      if (!m.venue?.name) continue;
      const ex = map.get(m.venue.name);
      const hosted = m.status === "FINISHED" ? 1 : 0;
      if (ex) ex.matchesHosted = (ex.matchesHosted ?? 0) + hosted;
      else
        map.set(m.venue.name, {
          id: map.size + 1,
          name: m.venue.name,
          city: m.venue.city ?? "",
          matchesHosted: hosted,
        });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getBracket(): Promise<BracketRound[]> {
    const { matches } = await this.dataset();
    const stages: Stage[] = [
      "ROUND_OF_32",
      "ROUND_OF_16",
      "QUARTER_FINAL",
      "SEMI_FINAL",
      "FINAL",
    ];
    return stages
      .map((stage) => ({
        round: stage,
        ties: matches
          .filter((m) => m.stage === stage)
          .map((m, i): BracketTie => ({
            id: `${stage}-${i + 1}`,
            round: stage,
            matchId: m.id,
            status: m.status,
            home: m.homeTeam.id ? m.homeTeam : undefined,
            away: m.awayTeam.id ? m.awayTeam : undefined,
            homeScore: m.score.home,
            awayScore: m.score.away,
          })),
      }))
      .filter((r) => r.ties.length > 0);
  }

  // TheSportsDB has no free league leaderboard endpoint — graceful empty.
  async getTopScorers(): Promise<Player[]> {
    return [];
  }
  async getTopAssists(): Promise<Player[]> {
    return [];
  }

  async search(q: string): Promise<SearchResults> {
    const query = q.trim().toLowerCase();
    if (!query) return { teams: [], players: [], matches: [], venues: [] };
    const [{ teams, matches }, venues, players] = await Promise.all([
      this.dataset(),
      this.getVenues(),
      query.length >= 3 ? this.getPlayers({ search: query }) : Promise.resolve([]),
    ]);
    return {
      teams: teams.filter(
        (t) => t.name.toLowerCase().includes(query) || t.code.toLowerCase().includes(query),
      ),
      players: players.slice(0, 25),
      matches: matches
        .filter(
          (m) =>
            m.homeTeam.name.toLowerCase().includes(query) ||
            m.awayTeam.name.toLowerCase().includes(query),
        )
        .slice(0, 20),
      venues: venues.filter(
        (v) => v.name.toLowerCase().includes(query) || v.city.toLowerCase().includes(query),
      ),
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Official WC 2026 knockout schedule (source: FIFA / Wikipedia). Exact kick-off
// times in UTC, so they render correctly in any timezone — e.g. the Final is
// July 19, 3:00 PM ET = 19:00 UTC = July 20, 1:00 AM Bangladesh time. Teams stay
// "TBD" until the data source publishes the actual qualifiers.
const KO_FIXTURES: { stage: Stage; round: string; utc: string; venue: string; city: string }[] = [
  // Round of 32 (June 28 – July 3)
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-06-28T19:00:00Z", venue: "SoFi Stadium", city: "Los Angeles" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-06-29T17:00:00Z", venue: "NRG Stadium", city: "Houston" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-06-29T20:30:00Z", venue: "Gillette Stadium", city: "Boston" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-06-30T01:00:00Z", venue: "Estadio BBVA", city: "Monterrey" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-06-30T17:00:00Z", venue: "AT&T Stadium", city: "Dallas" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-06-30T21:00:00Z", venue: "MetLife Stadium", city: "New York / New Jersey" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-01T01:00:00Z", venue: "Estadio Azteca", city: "Mexico City" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-01T16:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-01T20:00:00Z", venue: "Lumen Field", city: "Seattle" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-02T00:00:00Z", venue: "Levi's Stadium", city: "San Francisco Bay Area" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-02T19:00:00Z", venue: "SoFi Stadium", city: "Los Angeles" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-02T23:00:00Z", venue: "BMO Field", city: "Toronto" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-03T03:00:00Z", venue: "BC Place", city: "Vancouver" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-03T18:00:00Z", venue: "AT&T Stadium", city: "Dallas" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-03T22:00:00Z", venue: "Hard Rock Stadium", city: "Miami" },
  { stage: "ROUND_OF_32", round: "Round of 32", utc: "2026-07-04T01:30:00Z", venue: "Arrowhead Stadium", city: "Kansas City" },
  // Round of 16 (July 4 – 7)
  { stage: "ROUND_OF_16", round: "Round of 16", utc: "2026-07-04T17:00:00Z", venue: "NRG Stadium", city: "Houston" },
  { stage: "ROUND_OF_16", round: "Round of 16", utc: "2026-07-04T21:00:00Z", venue: "Lincoln Financial Field", city: "Philadelphia" },
  { stage: "ROUND_OF_16", round: "Round of 16", utc: "2026-07-05T20:00:00Z", venue: "MetLife Stadium", city: "New York / New Jersey" },
  { stage: "ROUND_OF_16", round: "Round of 16", utc: "2026-07-06T00:00:00Z", venue: "Estadio Azteca", city: "Mexico City" },
  { stage: "ROUND_OF_16", round: "Round of 16", utc: "2026-07-06T19:00:00Z", venue: "AT&T Stadium", city: "Dallas" },
  { stage: "ROUND_OF_16", round: "Round of 16", utc: "2026-07-07T00:00:00Z", venue: "Lumen Field", city: "Seattle" },
  { stage: "ROUND_OF_16", round: "Round of 16", utc: "2026-07-07T16:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  { stage: "ROUND_OF_16", round: "Round of 16", utc: "2026-07-07T20:00:00Z", venue: "BC Place", city: "Vancouver" },
  // Quarter-finals (July 9 – 11)
  { stage: "QUARTER_FINAL", round: "Quarter-final", utc: "2026-07-09T20:00:00Z", venue: "Gillette Stadium", city: "Boston" },
  { stage: "QUARTER_FINAL", round: "Quarter-final", utc: "2026-07-10T19:00:00Z", venue: "SoFi Stadium", city: "Los Angeles" },
  { stage: "QUARTER_FINAL", round: "Quarter-final", utc: "2026-07-11T21:00:00Z", venue: "Hard Rock Stadium", city: "Miami" },
  { stage: "QUARTER_FINAL", round: "Quarter-final", utc: "2026-07-12T01:00:00Z", venue: "Arrowhead Stadium", city: "Kansas City" },
  // Semi-finals (July 14 – 15)
  { stage: "SEMI_FINAL", round: "Semi-final", utc: "2026-07-14T19:00:00Z", venue: "AT&T Stadium", city: "Dallas" },
  { stage: "SEMI_FINAL", round: "Semi-final", utc: "2026-07-15T19:00:00Z", venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  // Third-place play-off (July 18)
  { stage: "THIRD_PLACE", round: "Third-place play-off", utc: "2026-07-18T21:00:00Z", venue: "Hard Rock Stadium", city: "Miami" },
  // Final (July 19, 3:00 PM ET → July 20, 1:00 AM BDT)
  { stage: "FINAL", round: "Final", utc: "2026-07-19T19:00:00Z", venue: "MetLife Stadium", city: "New York / New Jersey" },
];

const TBD: TeamRef = { id: 0, name: "TBD", code: "TBD", flag: "🏳️" };

// Synthetic ids start high to never collide with real TheSportsDB event ids,
// and are deterministic so /match/:id links stay stable across cache refreshes.
const SKELETON_ID_BASE = 9_900_000;

function knockoutSkeleton(): Match[] {
  return KO_FIXTURES.map((f, i) => ({
    id: SKELETON_ID_BASE + i + 1,
    status: "SCHEDULED" as const,
    minute: null,
    utcDate: new Date(f.utc).toISOString(),
    stage: f.stage,
    round: f.round,
    homeTeam: { ...TBD },
    awayTeam: { ...TBD },
    score: { home: null, away: null },
    venue: { id: 0, name: f.venue, city: f.city },
  }));
}

// Derive group letters from group-stage fixtures: teams that play each other in
// the group stage form a connected component (a group of 4). Groups are labelled
// A, B, C… in order of their first kick-off, matching the official ordering.
function deriveGroups(matches: Match[]): Record<number, string> {
  const adj = new Map<number, Set<number>>();
  const firstDate = new Map<number, string>();
  for (const m of matches) {
    if (m.stage !== "GROUP_STAGE") continue;
    const a = m.homeTeam.id;
    const b = m.awayTeam.id;
    if (!a || !b) continue;
    (adj.get(a) ?? adj.set(a, new Set()).get(a)!).add(b);
    (adj.get(b) ?? adj.set(b, new Set()).get(b)!).add(a);
    for (const t of [a, b]) {
      if (!firstDate.has(t) || m.utcDate < firstDate.get(t)!) firstDate.set(t, m.utcDate);
    }
  }

  const seen = new Set<number>();
  const components: number[][] = [];
  for (const team of adj.keys()) {
    if (seen.has(team)) continue;
    const comp: number[] = [];
    const stack = [team];
    seen.add(team);
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const nb of adj.get(cur) ?? []) {
        if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
      }
    }
    components.push(comp);
  }

  components.sort((x, y) => {
    const dx = Math.min(...x.map((t) => Date.parse(firstDate.get(t) ?? "9999")));
    const dy = Math.min(...y.map((t) => Date.parse(firstDate.get(t) ?? "9999")));
    return dx - dy;
  });

  const out: Record<number, string> = {};
  components.forEach((comp, i) => {
    const letter = String.fromCharCode(65 + i); // A, B, C…
    for (const t of comp) out[t] = letter;
  });
  return out;
}

function mapStats(eventstats: any[] | undefined, homeId: number, awayId: number): TeamStatistics[] {
  if (!eventstats || eventstats.length === 0) return [];
  const home: TeamStatistics = { teamId: homeId };
  const away: TeamStatistics = { teamId: awayId };
  const num = (v: any) => {
    const n = Number(String(v ?? "").replace("%", ""));
    return isNaN(n) ? undefined : n;
  };
  const assign = (s: TeamStatistics, type: string, v: any) => {
    const t = type.toLowerCase();
    if (t.includes("possession")) s.possession = num(v);
    else if (t.includes("shots on")) s.shotsOnTarget = num(v);
    else if (t.includes("shots")) s.shots = num(v);
    else if (t.includes("corner")) s.corners = num(v);
    else if (t.includes("foul")) s.fouls = num(v);
    else if (t.includes("offside")) s.offsides = num(v);
    else if (t.includes("save")) s.saves = num(v);
  };
  for (const st of eventstats) {
    assign(home, st.strStat ?? "", st.intHome);
    assign(away, st.strStat ?? "", st.intAway);
  }
  return [home, away];
}

function mapLineups(lineup: any[] | undefined, homeId: number, awayId: number) {
  if (!lineup || lineup.length === 0) return [];
  const build = (teamId: number) => {
    const players = lineup.filter((l) => Number(l.idTeam) === teamId);
    const toLP = (p: any) => ({
      number: p.intSquadNumber ? Number(p.intSquadNumber) : 0,
      name: p.strPlayer ?? "",
      position: (p.strPosition ?? "")[0] ?? "",
    });
    return {
      teamId,
      formation: players[0]?.strFormation || undefined,
      startXI: players.filter((p) => p.strSubstitute !== "Yes").map(toLP),
      bench: players.filter((p) => p.strSubstitute === "Yes").map(toLP),
    };
  };
  const out = [build(homeId), build(awayId)];
  return out.every((l) => l.startXI.length === 0 && l.bench.length === 0) ? [] : out;
}

function mapTsdbPlayer(p: any): Player {
  return {
    id: Number(p.idPlayer),
    name: p.strPlayer,
    teamId: Number(p.idTeam) || 0,
    teamName: p.strTeam ?? "",
    position: normalizePosition(p.strPosition),
    number: p.strNumber ? Number(p.strNumber) : undefined,
    nationality: p.strNationality,
  };
}
