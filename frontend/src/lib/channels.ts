export type Channel = {
  id: number;
  name: string;
  key: string;
  url: string;
  /** Stream container type, inferred from the URL extension. */
  type: "dash" | "hls";
  /** ClearKey DRM as a { keyIdHex: keyHex } map, if the stream is encrypted. */
  drm?: Record<string, string>;
};

function streamType(url: string): "dash" | "hls" {
  return /\.m3u8(\?|$)/i.test(url) ? "hls" : "dash";
}

/**
 * Parse the "IPTV Channel List from LiveKhela.tv" markdown table.
 * Columns: Channel Name | Key | Stream URL | ClearKey DRM
 * Rows whose Stream URL is "N/A" are skipped.
 */
export function parseLiveKhela(text: string): Channel[] {
  const channels: Channel[] = [];
  let id = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;

    const cells = line
      .split("|")
      .slice(1, -1) // drop the empty edges from leading/trailing pipes
      .map((c) => c.trim());
    if (cells.length < 3) continue;

    const [name, key, url, drmRaw] = cells;
    // Skip header and separator rows.
    if (/^channel name$/i.test(name) || /^-+$/.test(name)) continue;
    if (!url || /^n\/a$/i.test(url)) continue;

    let drm: Record<string, string> | undefined;
    if (drmRaw && drmRaw !== "{}" && !/^n\/a$/i.test(drmRaw)) {
      try {
        const parsed = JSON.parse(drmRaw);
        if (parsed && typeof parsed === "object" && Object.keys(parsed).length) {
          drm = parsed;
        }
      } catch {
        // ignore malformed DRM cell
      }
    }

    channels.push({
      id: id++,
      name,
      key: key || name,
      url,
      type: streamType(url),
      drm,
    });
  }

  return channels;
}
