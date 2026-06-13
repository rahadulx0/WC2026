"use client";

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/format";

export function Countdown({ to, compact = false }: { to: string; compact?: boolean }) {
  const [parts, setParts] = useState(() => countdownParts(to));

  useEffect(() => {
    const id = setInterval(() => setParts(countdownParts(to)), 1000);
    return () => clearInterval(id);
  }, [to]);

  if (parts.done) return <span className="font-semibold text-pitch-500">Kicking off</span>;

  if (compact) {
    return (
      <span className="tabular-nums">
        {parts.days > 0 && `${parts.days}d `}
        {String(parts.hours).padStart(2, "0")}:{String(parts.minutes).padStart(2, "0")}:
        {String(parts.seconds).padStart(2, "0")}
      </span>
    );
  }

  const cells = [
    { v: parts.days, l: "Days" },
    { v: parts.hours, l: "Hours" },
    { v: parts.minutes, l: "Min" },
    { v: parts.seconds, l: "Sec" },
  ];
  return (
    <div className="flex gap-2 sm:gap-3">
      {cells.map((c) => (
        <div
          key={c.l}
          className="flex min-w-14 flex-col items-center rounded-lg bg-white/10 px-3 py-2 backdrop-blur"
        >
          <span className="text-2xl font-bold tabular-nums sm:text-3xl">
            {String(c.v).padStart(2, "0")}
          </span>
          <span className="text-[10px] uppercase tracking-wide opacity-80">{c.l}</span>
        </div>
      ))}
    </div>
  );
}
