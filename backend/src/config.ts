import "dotenv/config";

const apiFootballKey = process.env.API_FOOTBALL_KEY?.trim() ?? "";

// Which provider backs the API. Default: TheSportsDB (free, has real WC 2026 data).
const provider = (process.env.PROVIDER?.trim() || "thesportsdb") as
  | "thesportsdb"
  | "apifootball";

export const config = {
  port: Number(process.env.PORT ?? 4000),
  provider,
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // TheSportsDB (free). Key "3" is the public/no-signup key.
  theSportsDb: {
    base: process.env.THESPORTSDB_BASE?.trim() || "https://www.thesportsdb.com/api/v1/json",
    key: process.env.THESPORTSDB_KEY?.trim() || "3",
    leagueId: Number(process.env.THESPORTSDB_LEAGUE_ID ?? 4429), // FIFA World Cup
    season: process.env.THESPORTSDB_SEASON?.trim() || "2026",
  },

  // API-Football (api-sports.io) — optional alternate provider. Note: its free
  // tier does NOT include WC 2026 (free = seasons 2022–2024).
  apiFootball: {
    key: apiFootballKey,
    base: process.env.API_FOOTBALL_BASE?.trim() || "https://v3.football.api-sports.io",
    leagueId: Number(process.env.WC_LEAGUE_ID ?? 1),
    season: Number(process.env.WC_SEASON ?? 2026),
  },
};

export type AppConfig = typeof config;
