"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Goal, Search } from "lucide-react";
import { Chip, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { Player, PlayerPosition } from "@/lib/types";

const POSITIONS: (PlayerPosition | "All")[] = [
  "All",
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
];

export default function PlayersPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [pos, setPos] = useState<PlayerPosition | "All">("All");

  // Debounce typing before hitting the API.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  const ready = debounced.length >= 3;
  const { data, isLoading } = useApi<Player[]>(
    ready ? `/players?search=${encodeURIComponent(debounced)}` : null,
  );

  const filtered = useMemo(
    () => (data ?? []).filter((p) => pos === "All" || p.position === pos),
    [data, pos],
  );

  return (
    <div>
      <PageHeader title="Players" subtitle="Search the tournament's squads by name" />

      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type at least 3 letters (e.g. a player or surname)…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-pitch-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {ready && data && data.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {POSITIONS.map((p) => (
              <Chip key={p} active={pos === p} onClick={() => setPos(p)}>
                {p}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {!ready ? (
        <EmptyState
          title="Search for a player"
          hint="Enter at least three letters to find players across all 48 squads."
        />
      ) : isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title={`No players found for “${debounced}”`} />
      ) : (
        <>
          <p className="muted mb-3 text-sm">{filtered.length} players</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/player/${p.id}`}
                className="card flex items-center gap-3 px-4 py-3 transition hover:border-pitch-300"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">
                  {p.number ?? "–"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="muted truncate text-xs">
                    {p.teamName}
                    {p.position ? ` · ${p.position}` : ""}
                  </p>
                </div>
                {(p.stats?.goals ?? 0) > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-sm">
                    <Goal className="h-4 w-4 text-pitch-600" />
                    {p.stats?.goals}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
