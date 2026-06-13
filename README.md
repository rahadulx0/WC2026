# FIFA World Cup 2026 Live Center

A database-free web app for the 2026 World Cup: live scores, fixtures, standings,
knockout bracket, teams, squads, players, venues, search, and a stats dashboard.

```
Football API  →  Express backend (proxy + in-memory cache)  →  Next.js frontend
```

No database. The backend is a thin, caching proxy over a football data provider;
the frontend renders normalized JSON and auto-refreshes live data.

## Stack

| Layer    | Tech                                              | Deploy  |
| -------- | ------------------------------------------------- | ------- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind v4, SWR| Vercel  |
| Backend  | Node.js, Express, TypeScript, node-cache          | Render  |

## Quick start

```bash
# from the repo root
npm install            # installs concurrently (root)
npm run install:all    # installs backend + frontend deps
npm run dev            # runs BOTH: backend :4000, frontend :3000
```

Open **http://localhost:3000**. The API is at **http://localhost:4000/api**.

Run them separately if you prefer: `npm run dev:backend` / `npm run dev:frontend`.

## Data provider

The backend depends only on a `FootballProvider` interface, so the frontend never
knows which source is behind the API. **Real data only — no mock/demo data.** When
the upstream API has nothing for a resource, endpoints return empty results and the
UI shows graceful empty states (it never fabricates data). Two providers ship:

- **`thesportsdb`** (default) — [TheSportsDB](https://www.thesportsdb.com/) **free**
  API. The only free source that actually carries **World Cup 2026** data: real
  fixtures, scores, venues and team badges. The full schedule is assembled from the
  per-round endpoints, and **groups, standings, teams, venues and the bracket are
  derived from those real fixtures**. The knockout bracket appears once the group
  stage produces qualifiers. Match timelines/stats are shown where available;
  lineups and per-player season stats are limited on the free key.
- **`apifootball`** — [API-Football](https://www.api-football.com/). Richer detail
  (events, stats, lineups, player stats, leaderboards) **but its free tier does NOT
  include WC 2026** (free = seasons 2022–2024). Use it with a paid plan for 2026, or
  with `WC_SEASON=2022` to preview the real 2022 World Cup.

Select the provider in `backend/.env` (`PROVIDER=thesportsdb` | `apifootball`):

```bash
PROVIDER=thesportsdb
THESPORTSDB_KEY=3            # free public key; a Patreon key lifts rate limits
THESPORTSDB_LEAGUE_ID=4429  # FIFA World Cup
THESPORTSDB_SEASON=2026
```

> **Note:** WC 2026 results/live scores only exist once matches are actually played,
> so early in the tournament most fixtures show as scheduled. That is real data, not
> a placeholder.

## Backend endpoints

```
GET /api/health
GET /api/live                      # live matches            (cache 15s)
GET /api/matches?stage=&date=&team=&status=&limit=   (cache 30m)
GET /api/matches/:id               # events, stats, lineups  (cache 15s)
GET /api/standings                 # all groups              (cache 60s)
GET /api/bracket                   # knockout bracket        (cache 60s)
GET /api/teams                     #                         (cache 24h)
GET /api/teams/:id                 # overview, squad, fixtures
GET /api/players?search=&team=     #                         (cache 1h)
GET /api/players/:id
GET /api/venues                    #                         (cache 24h)
GET /api/leaderboards/scorers      # top scorers             (cache 5m)
GET /api/leaderboards/assists      # top assists             (cache 5m)
GET /api/search?q=                 # teams, players, matches, venues
```

Cache TTLs follow the plan's caching strategy. Concurrent identical requests are
collapsed into a single upstream call.

## Pages

`/` home (hero + countdown, live, today, upcoming, recent) · `/fixtures` (stage
filters) · `/match/[id]` (timeline, stats, lineups; 15s refresh) · `/standings`
(60s refresh) · `/bracket` · `/teams` · `/team/[id]` · `/players` (search) ·
`/player/[id]` · `/venues` · `/search` · `/stats` (leaderboards + aggregates).

Plus: dark mode, local-timezone conversion, live countdown timers.

## Deployment

- **Backend → Render:** root `backend/`, build `npm install && npm run build`,
  start `npm start`. Set the env vars above and `CORS_ORIGIN` to your Vercel URL.
- **Frontend → Vercel:** root `frontend/`. Set `NEXT_PUBLIC_API_BASE` to your
  Render URL + `/api`.
```
