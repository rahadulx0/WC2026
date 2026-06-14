import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { parseLiveKhela } from "@/lib/channels";

const PLAYLIST_FILE = "IPTV Channel List from LiveKhela.tv";

// The channel list lives in the repo root, one level above the frontend.
// Try a few candidate locations so this works in dev and after a build.
const CANDIDATES = [
  path.join(process.cwd(), "..", PLAYLIST_FILE),
  path.join(process.cwd(), PLAYLIST_FILE),
  path.join(process.cwd(), "public", PLAYLIST_FILE),
];

export const dynamic = "force-dynamic";

export async function GET() {
  for (const file of CANDIDATES) {
    try {
      const text = await fs.readFile(file, "utf8");
      const channels = parseLiveKhela(text);
      return NextResponse.json({ channels });
    } catch {
      // try next candidate
    }
  }
  return NextResponse.json(
    { channels: [], error: `Could not find "${PLAYLIST_FILE}".` },
    { status: 404 },
  );
}
