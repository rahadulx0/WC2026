// Centralized professional icons (lucide-react). Team flags stay as emoji/logos;
// everything else uses SVG icons for a consistent, professional look.
import { Goal, Target, ArrowRightLeft, Tv } from "lucide-react";
import type { EventType } from "@/lib/types";

// A football card rendered as a crisp colored rounded rectangle.
export function CardBadge({ color }: { color: "yellow" | "red" }) {
  return (
    <span
      className={`inline-block h-4 w-3 rounded-[2px] ${
        color === "yellow" ? "bg-amber-400" : "bg-red-500"
      }`}
      aria-hidden="true"
    />
  );
}

export function EventIcon({ type, className = "h-4 w-4" }: { type: EventType; className?: string }) {
  switch (type) {
    case "GOAL":
      return <Goal className={`${className} text-pitch-600`} aria-label="Goal" />;
    case "PENALTY_GOAL":
      return <Target className={`${className} text-pitch-600`} aria-label="Penalty goal" />;
    case "OWN_GOAL":
      return <Goal className={`${className} text-red-500`} aria-label="Own goal" />;
    case "YELLOW_CARD":
      return <CardBadge color="yellow" />;
    case "RED_CARD":
      return <CardBadge color="red" />;
    case "SUBSTITUTION":
      return <ArrowRightLeft className={`${className} text-slate-500`} aria-label="Substitution" />;
    case "VAR":
      return <Tv className={`${className} text-blue-500`} aria-label="VAR review" />;
    default:
      return null;
  }
}
