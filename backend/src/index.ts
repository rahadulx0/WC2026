import { createApp } from "./app.js";
import { config } from "./config.js";
import { provider } from "./providers/index.js";

const app = createApp();

const season =
  provider.name === "thesportsdb" ? config.theSportsDb.season : config.apiFootball.season;

app.listen(config.port, () => {
  console.log(
    `\n⚽  WC2026 backend listening on http://localhost:${config.port}` +
      `\n    Provider: ${provider.name} · season ${season}` +
      `\n    Try: http://localhost:${config.port}/api/health\n`,
  );
});
