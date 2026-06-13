import type { MetadataRoute } from "next";

// Makes the site installable as a standalone app ("Add to Home Screen").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FIFA World Cup 2026 Live Center",
    short_name: "WC 2026",
    description:
      "Live scores, fixtures, standings, bracket, teams and venues for the FIFA World Cup 2026.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#16a34a",
    categories: ["sports"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
