"use client";

import { use, type ReactNode } from "react";
import Link from "next/link";
import { Goal, Handshake, Shirt, Timer } from "lucide-react";
import { CardBadge } from "@/components/icons";
import { Spinner } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { Player } from "@/lib/types";

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: p, isLoading } = useApi<Player>(`/players/${id}`);

  if (isLoading && !p) return <Spinner />;
  if (!p) return <p className="muted">Player not found.</p>;

  const s = p.stats ?? {};
  const cards: { label: string; value: number | string; icon: ReactNode }[] = [
    { label: "Goals", value: s.goals ?? 0, icon: <Goal className="h-6 w-6 text-pitch-600" /> },
    { label: "Assists", value: s.assists ?? 0, icon: <Handshake className="h-6 w-6 text-brand" /> },
    { label: "Appearances", value: s.appearances ?? 0, icon: <Shirt className="h-6 w-6 text-slate-500" /> },
    { label: "Minutes", value: s.minutesPlayed ?? 0, icon: <Timer className="h-6 w-6 text-slate-500" /> },
    { label: "Yellow Cards", value: s.yellowCards ?? 0, icon: <CardBadge color="yellow" /> },
    { label: "Red Cards", value: s.redCards ?? 0, icon: <CardBadge color="red" /> },
  ];

  return (
    <div className="space-y-6">
      <Link href="/players" className="text-sm font-medium text-pitch-600">← All players</Link>

      <div className="card flex flex-wrap items-center gap-5 px-6 py-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand to-pitch-600 text-2xl font-bold text-white">
          {p.number ?? "–"}
        </span>
        <div>
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <p className="muted mt-1 text-sm">
            <Link href={`/team/${p.teamId}`} className="hover:text-pitch-600">
              {p.teamName}
            </Link>{" "}
            · {p.position}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="card flex flex-col items-center px-3 py-4 text-center">
            <span className="flex h-7 items-center">{c.icon}</span>
            <span className="mt-1 text-2xl font-bold tabular-nums">{c.value}</span>
            <span className="muted text-xs">{c.label}</span>
          </div>
        ))}
      </div>

      <p className="muted text-center text-xs">
        Detailed per-player tournament statistics are shown where the data provider supplies them.
      </p>
    </div>
  );
}
