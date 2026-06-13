import { config } from "../config.js";
import { ApiFootballProvider } from "./apiFootball.js";
import { TheSportsDbProvider } from "./theSportsDb.js";
import type { FootballProvider } from "./types.js";

// The rest of the app depends only on the FootballProvider interface.
// Default: TheSportsDB (free, real WC 2026 data). Set PROVIDER=apifootball to
// use API-Football instead (requires a plan that includes the chosen season).
export function createProvider(): FootballProvider {
  if (config.provider === "apifootball") {
    if (!config.apiFootball.key) {
      console.warn("[provider] PROVIDER=apifootball but API_FOOTBALL_KEY is not set.");
    }
    return new ApiFootballProvider();
  }
  return new TheSportsDbProvider();
}

export const provider: FootballProvider = createProvider();
