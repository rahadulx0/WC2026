import { Router } from "express";
import { cached, cacheStats, TTL } from "../cache.js";
import { provider } from "../providers/index.js";
import type { MatchQuery, Stage } from "../providers/types.js";
import { STAGES } from "../providers/types.js";

export const api = Router();

// Small helper to wrap async handlers and forward errors.
const h =
  (fn: (req: any, res: any) => Promise<unknown>) =>
  (req: any, res: any, next: any) =>
    fn(req, res).catch(next);

api.get("/health", (_req, res) => {
  res.json({ status: "ok", provider: provider.name, cache: cacheStats() });
});

// GET /api/live — live matches (cache 15s)
api.get(
  "/live",
  h(async (_req, res) => {
    const data = await cached("live", TTL.live, () => provider.getLiveMatches());
    res.json(data);
  }),
);

// GET /api/matches — fixtures with optional filters (cache 30m)
api.get(
  "/matches",
  h(async (req, res) => {
    const q: MatchQuery = {};
    const stage = req.query.stage as string | undefined;
    if (stage && (STAGES as string[]).includes(stage)) q.stage = stage as Stage;
    if (req.query.date) q.date = String(req.query.date);
    if (req.query.status) q.status = String(req.query.status) as MatchQuery["status"];
    if (req.query.team) q.teamId = Number(req.query.team);
    if (req.query.limit) q.limit = Number(req.query.limit);
    const key = `matches:${JSON.stringify(q)}`;
    const data = await cached(key, TTL.fixtures, () => provider.getMatches(q));
    res.json(data);
  }),
);

// GET /api/matches/:id — full match detail (cache 15s for live freshness)
api.get(
  "/matches/:id",
  h(async (req, res) => {
    const id = Number(req.params.id);
    const data = await cached(`match:${id}`, TTL.matchDetails, () =>
      provider.getMatchDetails(id),
    );
    if (!data) return res.status(404).json({ error: "Match not found" });
    res.json(data);
  }),
);

// GET /api/standings — all groups (cache 60s)
api.get(
  "/standings",
  h(async (_req, res) => {
    const data = await cached("standings", TTL.standings, () => provider.getStandings());
    res.json(data);
  }),
);

// GET /api/bracket — knockout bracket (cache 60s)
api.get(
  "/bracket",
  h(async (_req, res) => {
    const data = await cached("bracket", TTL.bracket, () => provider.getBracket());
    res.json(data);
  }),
);

// GET /api/teams — all teams (cache 24h)
api.get(
  "/teams",
  h(async (_req, res) => {
    const data = await cached("teams", TTL.teams, () => provider.getTeams());
    res.json(data);
  }),
);

// GET /api/teams/:id — team detail (cache 1h)
api.get(
  "/teams/:id",
  h(async (req, res) => {
    const id = Number(req.params.id);
    const data = await cached(`team:${id}`, TTL.players, () => provider.getTeam(id));
    if (!data) return res.status(404).json({ error: "Team not found" });
    res.json(data);
  }),
);

// GET /api/players — searchable list (cache 1h)
api.get(
  "/players",
  h(async (req, res) => {
    const search = req.query.search ? String(req.query.search) : undefined;
    const teamId = req.query.team ? Number(req.query.team) : undefined;
    const key = `players:${search ?? ""}:${teamId ?? ""}`;
    const data = await cached(key, TTL.players, () => provider.getPlayers({ search, teamId }));
    res.json(data);
  }),
);

// GET /api/players/:id — player detail (cache 1h)
api.get(
  "/players/:id",
  h(async (req, res) => {
    const id = Number(req.params.id);
    const data = await cached(`player:${id}`, TTL.players, () => provider.getPlayer(id));
    if (!data) return res.status(404).json({ error: "Player not found" });
    res.json(data);
  }),
);

// GET /api/venues — venues (cache 24h)
api.get(
  "/venues",
  h(async (_req, res) => {
    const data = await cached("venues", TTL.venues, () => provider.getVenues());
    res.json(data);
  }),
);

// GET /api/leaderboards/scorers — top scorers (cache 5m)
api.get(
  "/leaderboards/scorers",
  h(async (_req, res) => {
    const data = await cached("scorers", TTL.leaderboard, () => provider.getTopScorers());
    res.json(data);
  }),
);

// GET /api/leaderboards/assists — top assists (cache 5m)
api.get(
  "/leaderboards/assists",
  h(async (_req, res) => {
    const data = await cached("assists", TTL.leaderboard, () => provider.getTopAssists());
    res.json(data);
  }),
);

// GET /api/search?q= — global search (cache 60s)
api.get(
  "/search",
  h(async (req, res) => {
    const q = String(req.query.q ?? "");
    const data = await cached(`search:${q.toLowerCase()}`, TTL.search, () =>
      provider.search(q),
    );
    res.json(data);
  }),
);
