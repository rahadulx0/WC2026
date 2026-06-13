import compression from "compression";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { provider } from "./providers/index.js";
import { api } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(compression());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow no-origin (curl, server-to-server) and any configured origin.
        if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes("*")) {
          return cb(null, true);
        }
        cb(null, true); // public read-only API — permissive by design
      },
    }),
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "FIFA World Cup 2026 Live Center API",
      provider: provider.name,
      season:
        provider.name === "thesportsdb"
          ? config.theSportsDb.season
          : config.apiFootball.season,
      endpoints: [
        "/api/health",
        "/api/live",
        "/api/matches",
        "/api/matches/:id",
        "/api/standings",
        "/api/bracket",
        "/api/teams",
        "/api/teams/:id",
        "/api/players",
        "/api/players/:id",
        "/api/venues",
        "/api/leaderboards/scorers",
        "/api/leaderboards/assists",
        "/api/search?q=",
      ],
    });
  });

  app.use("/api", api);

  // 404
  app.use((_req, res) => res.status(404).json({ error: "Not found" }));

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[error]", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
