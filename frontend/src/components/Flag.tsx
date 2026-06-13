// Renders a team "flag" whether it's an emoji (e.g. fallback) or a badge/logo URL
// (TheSportsDB / API-Football). Keeps the rest of the UI provider-agnostic.

// Map the emoji text-size to comparable image dimensions so badges scale with
// the surrounding context.
const IMG_SIZE: Record<string, string> = {
  "text-base": "h-5 w-5",
  "text-lg": "h-6 w-6",
  "text-xl": "h-7 w-7",
  "text-2xl": "h-8 w-8",
  "text-5xl": "h-14 w-14",
  "text-6xl": "h-16 w-16",
};

export function Flag({ flag, size = "text-2xl" }: { flag: string; size?: string }) {
  if (flag?.startsWith("http")) {
    const dim = IMG_SIZE[size] ?? "h-6 w-6";
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={flag}
        alt=""
        className={`inline-block ${dim} shrink-0 object-contain`}
        loading="lazy"
      />
    );
  }
  return (
    <span className={size} aria-hidden="true">
      {flag || "🏳️"}
    </span>
  );
}
