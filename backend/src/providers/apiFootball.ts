// ── API-Football provider (api-sports.io) ────────────────────────────────────
// The single production data source. Maps API-Football's World Cup payloads into
// our normalized domain model. No fabricated/demo data: when the upstream API
// has nothing for the configured season, methods return empty results and the
// frontend renders its graceful empty states.

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
  Venue,
} from "./types.js";

function statusFromShort(short: string): MatchStatus {
  if (["1H", "2H", "ET", "BT", "P", "LIVE", "INT"].includes(short)) return "LIVE";
  if (short === "HT") return "HALFTIME";
  if (["FT", "AET", "PEN"].includes(short)) return "FINISHED";
  if (["PST"].includes(short)) return "POSTPONED";
  if (["CANC", "ABD", "AWD", "WO"].includes(short)) return "CANCELLED";
  return "SCHEDULED";
}

function stageFromRound(round: string): { stage: Stage; group?: string } {
  const r = (round || "").toLowerCase();
  if (r.startsWith("group")) {
    const g = round.split(" ")[1]?.toUpperCase();
    return { stage: "GROUP_STAGE", group: g };
  }
  if (r.includes("round of 32")) return { stage: "ROUND_OF_32" };
  if (r.includes("round of 16") || r.includes("8th")) return { stage: "ROUND_OF_16" };
  if (r.includes("quarter")) return { stage: "QUARTER_FINAL" };
  if (r.includes("semi")) return { stage: "SEMI_FINAL" };
  if (r.includes("3rd") || r.includes("third")) return { stage: "THIRD_PLACE" };
  if (r.includes("final")) return { stage: "FINAL" };
  return { stage: "GROUP_STAGE" };
}

function eventType(type: string, detail: string): EventType {
  const t = (type || "").toLowerCase();
  const d = (detail || "").toLowerCase();
  if (t === "goal") {
    if (d.includes("own")) return "OWN_GOAL";
    if (d.includes("penalty")) return "PENALTY_GOAL";
    return "GOAL";
  }
  if (t === "card") return d.includes("red") ? "RED_CARD" : "YELLOW_CARD";
  if (t === "subst") return "SUBSTITUTION";
  if (t === "var") return "VAR";
  return "GOAL";
}

function normalizePosition(pos: string): PlayerPosition {
  const p = (pos || "").toLowerCase();
  if (p.startsWith("goal") || p === "g") return "Goalkeeper";
  if (p.startsWith("def") || p === "d") return "Defender";
  if (p.startsWith("mid") || p === "m") return "Midfielder";
  return "Forward";
}

function codeFromName(name: string): string {
  return (name || "")
    .replace(/[^A-Za-z ]/g, "")
    .trim()
    .slice(0, 3)
    .toUpperCase();
}

interface ApiResponse<T> {
  errors: unknown;
  results: number;
  response: T;
}

export class ApiFootballProvider implements FootballProvider {
  readonly name = "apifootball";
  private base = config.apiFootball.base;
  private league = config.apiFootball.leagueId;
  private season = config.apiFootball.season;

  private headers(): Record<string, string> {
    if (this.base.includes("rapidapi")) {
      return {
        "x-rapidapi-key": config.apiFootball.key,
        "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
      };
    }
    return { "x-apisports-key": config.apiFootball.key };
  }

  private async get<T>(path: string): Promise<T | null> {
    if (!config.apiFootball.key) {
      console.warn("[apifootball] no API key configured — returning empty");
      return null;
    }
    try {
      const res = await fetch(`${this.base}${path}`, { headers: this.headers() });
      if (!res.ok) {
        console.warn(`[apifootball] HTTP ${res.status} for ${path}`);
        return null;
      }
      const json = (await res.json()) as ApiResponse<T>;
      const errs = json.errors;
      const hasErrors = Array.isArray(errs)
        ? errs.length > 0
        : errs && Object.keys(errs).length > 0;
      if (hasErrors) {
        console.warn(`[apifootball] api errors for ${path}:`, errs);
        return null;
      }
      if (!json.results) return null;
      return json.response;
    } catch (err) {
      console.warn(`[apifootball] fetch failed for ${path}:`, (err as Error).message);
      return null;
    }
  }

  private teamRef(team: any, group?: string): TeamRef {
    return {
      id: team?.id ?? 0,
      name: team?.name ?? "TBD",
      code: team?.code || codeFromName(team?.name) || "TBD",
      flag: team?.logo || "🏳️", // logo URL; the Flag component renders URL-or-emoji
      group,
    };
  }

  private mapFixture(f: any): Match {
    const { stage, group } = stageFromRound(f.league?.round ?? "");
    const status = statusFromShort(f.fixture?.status?.short ?? "NS");
    const pen = f.score?.penalty;
    return {
      id: f.fixture.id,
      status,
      minute: f.fixture?.status?.elapsed ?? null,
      utcDate: f.fixture?.date,
      stage,
      group,
      round: f.league?.round,
      homeTeam: this.teamRef(f.teams.home, group),
      awayTeam: this.teamRef(f.teams.away, group),
      score: {
        home: f.goals?.home ?? null,
        away: f.goals?.away ?? null,
        halftime: f.score?.halftime,
        penalties: pen && pen.home != null ? { home: pen.home, away: pen.away } : undefined,
      },
      venue: f.fixture?.venue?.name
        ? {
            id: f.fixture.venue.id ?? 0,
            name: f.fixture.venue.name,
            city: f.fixture.venue.city ?? "",
          }
        : undefined,
    };
  }

  // ── Shared base resources (cached to respect the free-tier rate limit) ─────
  // One fixtures fetch powers matches, venues, bracket, search and team fixtures.
  private allFixtures(): Promise<Match[]> {
    return cached("af:allFixtures", TTL.fixtures, async () => {
      const res = await this.get<any[]>(
        `/fixtures?league=${this.league}&season=${this.season}`,
      );
      return (res ?? []).map((f) => this.mapFixture(f)).sort((a, b) =>
        a.utcDate.localeCompare(b.utcDate),
      );
    });
  }

  private allTeams(): Promise<TeamRef[]> {
    return cached("af:allTeams", TTL.teams, async () => {
      const res = await this.get<any[]>(
        `/teams?league=${this.league}&season=${this.season}`,
      );
      return (res ?? []).map((t: any) => this.teamRef(t.team));
    });
  }

  // ── Provider interface ─────────────────────────────────────────────────────
  async getLiveMatches(): Promise<Match[]> {
    const res = await this.get<any[]>(
      `/fixtures?league=${this.league}&season=${this.season}&live=all`,
    );
    return (res ?? []).map((f) => this.mapFixture(f));
  }

  async getMatches(query: MatchQuery = {}): Promise<Match[]> {
    let matches = await this.allFixtures();
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
    const res = await this.get<any[]>(`/fixtures?id=${id}`);
    if (!res || res.length === 0) return null;
    const f = res[0];
    const match = this.mapFixture(f);

    const events: MatchEvent[] = (f.events ?? []).map((e: any) => ({
      minute: e.time?.elapsed ?? 0,
      extra: e.time?.extra ?? undefined,
      type: eventType(e.type, e.detail),
      teamId: e.team?.id,
      player: e.player?.name,
      assist: e.assist?.name,
      detail: e.detail,
    }));

    const statistics = (f.statistics ?? []).map((s: any) => {
      const stat = (key: string) =>
        s.statistics?.find((x: any) => x.type === key)?.value ?? undefined;
      const pct = (v: any) =>
        typeof v === "string" ? Number(v.replace("%", "")) : v ?? undefined;
      return {
        teamId: s.team?.id,
        possession: pct(stat("Ball Possession")),
        shots: stat("Total Shots") ?? undefined,
        shotsOnTarget: stat("Shots on Goal") ?? undefined,
        corners: stat("Corner Kicks") ?? undefined,
        fouls: stat("Fouls") ?? undefined,
        offsides: stat("Offsides") ?? undefined,
        saves: stat("Goalkeeper Saves") ?? undefined,
      };
    });

    const lineups = (f.lineups ?? []).map((l: any) => ({
      teamId: l.team?.id,
      formation: l.formation,
      startXI: (l.startXI ?? []).map((p: any) => ({
        number: p.player?.number ?? 0,
        name: p.player?.name ?? "",
        position: p.player?.pos ?? "",
      })),
      bench: (l.substitutes ?? []).map((p: any) => ({
        number: p.player?.number ?? 0,
        name: p.player?.name ?? "",
        position: p.player?.pos ?? "",
      })),
    }));

    return { ...match, events, statistics, lineups };
  }

  async getStandings(): Promise<GroupStanding[]> {
    const res = await this.get<any[]>(
      `/standings?league=${this.league}&season=${this.season}`,
    );
    const groups = res?.[0]?.league?.standings;
    if (!groups || groups.length === 0) return [];
    return groups.map((table: any[]): GroupStanding => ({
      group: (table[0]?.group ?? "").replace(/^Group\s+/i, ""),
      table: table.map((row: any): StandingRow => ({
        position: row.rank,
        team: this.teamRef(row.team),
        playedGames: row.all?.played ?? 0,
        won: row.all?.win ?? 0,
        draw: row.all?.draw ?? 0,
        lost: row.all?.lose ?? 0,
        goalsFor: row.all?.goals?.for ?? 0,
        goalsAgainst: row.all?.goals?.against ?? 0,
        goalDifference: row.goalsDiff ?? 0,
        points: row.points ?? 0,
      })),
    }));
  }

  async getTeams(): Promise<TeamRef[]> {
    return this.allTeams();
  }

  async getTeam(id: number): Promise<TeamDetails | null> {
    const res = await this.get<any[]>(`/teams?id=${id}`);
    if (!res || res.length === 0) return null;
    const t = res[0].team;
    const venueName = res[0].venue?.name;

    const [squadRes, coachRes, fixtures] = await Promise.all([
      this.get<any[]>(`/players/squads?team=${id}`),
      this.get<any[]>(`/coachs?team=${id}`),
      this.getMatches({ teamId: id }),
    ]);

    const squad: Player[] =
      squadRes?.[0]?.players?.map((p: any): Player => ({
        id: p.id,
        name: p.name,
        teamId: id,
        teamName: t.name,
        position: normalizePosition(p.position),
        number: p.number ?? undefined,
        nationality: t.name,
      })) ?? [];

    const coach = coachRes?.[0]?.name;

    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    for (const f of fixtures) {
      if (f.status !== "FINISHED") continue;
      const isHome = f.homeTeam.id === id;
      const gf = (isHome ? f.score.home : f.score.away) ?? 0;
      const ga = (isHome ? f.score.away : f.score.home) ?? 0;
      goalsFor += gf;
      goalsAgainst += ga;
      if (gf > ga) wins++;
      else if (gf === ga) draws++;
      else losses++;
    }

    return {
      ...this.teamRef(t),
      coach,
      ranking: undefined, // API-Football does not expose FIFA ranking
      venueName,
      squad,
      stats: { wins, draws, losses, goalsFor, goalsAgainst },
      fixtures,
    };
  }

  async getPlayers(query: { search?: string; teamId?: number } = {}): Promise<Player[]> {
    // Player search needs >= 3 chars upstream. Without a query we return an empty
    // set and let the UI prompt for a search (the full roster would be hundreds
    // of paginated requests, impractical on the free tier).
    const params = new URLSearchParams({
      league: String(this.league),
      season: String(this.season),
    });
    if (query.teamId) params.set("team", String(query.teamId));
    if (query.search) {
      if (query.search.trim().length < 3) return [];
      params.set("search", query.search.trim());
    } else if (!query.teamId) {
      return [];
    }
    const res = await this.get<any[]>(`/players?${params.toString()}`);
    return (res ?? []).map((p: any) => mapPlayer(p));
  }

  async getPlayer(id: number): Promise<Player | null> {
    const res = await this.get<any[]>(`/players?id=${id}&season=${this.season}`);
    if (!res || res.length === 0) return null;
    return mapPlayer(res[0]);
  }

  async getVenues(): Promise<Venue[]> {
    // Derived from the real fixture list — the host stadiums actually in use.
    const fixtures = await this.allFixtures();
    const map = new Map<string, Venue>();
    for (const f of fixtures) {
      if (!f.venue?.name) continue;
      const key = f.venue.name;
      const existing = map.get(key);
      const hosted = f.status === "FINISHED" ? 1 : 0;
      if (existing) {
        existing.matchesHosted = (existing.matchesHosted ?? 0) + hosted;
      } else {
        map.set(key, {
          id: f.venue.id || map.size + 1,
          name: f.venue.name,
          city: f.venue.city ?? "",
          matchesHosted: hosted,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getBracket(): Promise<BracketRound[]> {
    const matches = await this.allFixtures();
    const knockoutStages: Stage[] = [
      "ROUND_OF_32",
      "ROUND_OF_16",
      "QUARTER_FINAL",
      "SEMI_FINAL",
      "FINAL",
    ];
    const rounds: BracketRound[] = knockoutStages
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
            penalties: m.score.penalties,
          })),
      }))
      .filter((r) => r.ties.length > 0);
    return rounds;
  }

  async getTopScorers(): Promise<Player[]> {
    const res = await this.get<any[]>(
      `/players/topscorers?league=${this.league}&season=${this.season}`,
    );
    return (res ?? []).map((p: any) => mapPlayer(p));
  }

  async getTopAssists(): Promise<Player[]> {
    const res = await this.get<any[]>(
      `/players/topassists?league=${this.league}&season=${this.season}`,
    );
    return (res ?? []).map((p: any) => mapPlayer(p));
  }

  async search(q: string): Promise<SearchResults> {
    const query = q.trim().toLowerCase();
    if (!query) return { teams: [], players: [], matches: [], venues: [] };

    const [teamsAll, fixtures, venuesAll, players] = await Promise.all([
      this.allTeams(),
      this.allFixtures(),
      this.getVenues(),
      query.length >= 3 ? this.getPlayers({ search: query }) : Promise.resolve([]),
    ]);

    const teams = teamsAll.filter(
      (t) => t.name.toLowerCase().includes(query) || t.code.toLowerCase().includes(query),
    );
    const matches = fixtures
      .filter(
        (m) =>
          m.homeTeam.name.toLowerCase().includes(query) ||
          m.awayTeam.name.toLowerCase().includes(query),
      )
      .slice(0, 20);
    const venues = venuesAll.filter(
      (v) => v.name.toLowerCase().includes(query) || v.city.toLowerCase().includes(query),
    );

    return { teams, players: players.slice(0, 25), matches, venues };
  }
}

function mapPlayer(entry: any): Player {
  const p = entry.player ?? entry;
  const stat = entry.statistics?.[0];
  return {
    id: p.id,
    name: p.name,
    teamId: stat?.team?.id ?? 0,
    teamName: stat?.team?.name ?? p.nationality ?? "",
    position: normalizePosition(stat?.games?.position ?? ""),
    number: stat?.games?.number ?? undefined,
    nationality: p.nationality,
    stats: stat
      ? {
          appearances: stat.games?.appearences ?? undefined,
          goals: stat.goals?.total ?? 0,
          assists: stat.goals?.assists ?? 0,
          yellowCards: stat.cards?.yellow ?? 0,
          redCards: stat.cards?.red ?? 0,
          minutesPlayed: stat.games?.minutes ?? undefined,
        }
      : undefined,
  };
}
