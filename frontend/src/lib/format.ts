import type { MatchStatus } from "./types";

// All kickoff times come from the API as UTC ISO strings. Per requirement, the
// whole site renders match times in Bangladesh Standard Time (BDT, UTC+6).
export const TIMEZONE = "Asia/Dhaka";
export const TZ_LABEL = "BDT";

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, ...opts });

// "1:00 AM" — kickoff time in Bangladesh time.
export function formatTime(iso: string): string {
  return fmt({ hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

// "Jun 14"
export function shortDate(iso: string): string {
  return fmt({ month: "short", day: "numeric" }).format(new Date(iso));
}

// "Sat, Jun 14 · 1:00 AM"
export function formatKickoff(iso: string): string {
  return fmt({
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

// "YYYY-MM-DD" of the kickoff in Bangladesh time — used to group matches by day.
export function dateKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayKey(): string {
  return dateKey(new Date());
}
export function tomorrowKey(): string {
  return dateKey(new Date(Date.now() + 86_400_000));
}

// "Saturday, June 14" from a YYYY-MM-DD day key (Bangladesh date).
export function fullDate(key: string): string {
  // 06:00 UTC = 12:00 in Dhaka, safely inside the day regardless of DST.
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${key}T06:00:00Z`));
}

export function isToday(iso: string): boolean {
  return dateKey(iso) === todayKey();
}

export function statusLabel(status: MatchStatus, minute: number | null): string {
  switch (status) {
    case "LIVE":
      return minute != null ? `${minute}'` : "LIVE";
    case "HALFTIME":
      return "HT";
    case "FINISHED":
      return "FT";
    case "POSTPONED":
      return "Postponed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "";
  }
}

export const isLive = (s: MatchStatus): boolean => s === "LIVE" || s === "HALFTIME";

// Countdown breakdown to a future ISO time.
export function countdownParts(iso: string, from = Date.now()) {
  const diff = Math.max(0, new Date(iso).getTime() - from);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    done: diff === 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
