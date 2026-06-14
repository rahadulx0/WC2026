"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Play, Search, Tv } from "lucide-react";
import { Skeleton, EmptyState } from "@/components/ui";
import { ShakaPlayer } from "@/components/ShakaPlayer";
import type { Channel } from "@/lib/channels";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Deterministic gradient + initials so every channel gets a distinct "thumbnail".
const GRADIENTS = [
  "from-rose-500 to-orange-500",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-fuchsia-600",
  "from-amber-500 to-red-600",
  "from-cyan-500 to-blue-600",
  "from-lime-500 to-green-600",
  "from-pink-500 to-rose-600",
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "TV";
}

function Thumb({ channel, className = "" }: { channel: Channel; className?: string }) {
  const grad = GRADIENTS[hash(channel.key || channel.name) % GRADIENTS.length];
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${grad} ${className}`}
    >
      <span className="text-2xl font-black tracking-tight text-white/90 drop-shadow">
        {initials(channel.name)}
      </span>
      <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        Live
      </span>
    </div>
  );
}

export default function ChannelsPage() {
  const { data, isLoading } = useSWR<{ channels: Channel[] }>("/api/channels", fetcher);
  const channels = data?.channels ?? [];

  const [active, setActive] = useState<Channel | null>(null);
  const [q, setQ] = useState("");
  const current = active ?? channels[0] ?? null;

  const others = useMemo(() => {
    const term = q.trim().toLowerCase();
    return channels.filter(
      (c) => c.id !== current?.id && (!term || c.name.toLowerCase().includes(term)),
    );
  }, [channels, current, q]);

  return (
    <div className="-mx-4 lg:mx-0">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_402px] lg:gap-6">
        {/* ── Primary column: player + meta ───────────────────────────── */}
        <div>
          <ShakaPlayer channel={current} />

          <div className="px-4 pt-3 lg:px-0">
            {isLoading && !current ? (
              <Skeleton className="h-7 w-2/3" />
            ) : current ? (
              <>
                <h1 className="text-lg font-bold leading-snug sm:text-xl">{current.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />
                    LIVE
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pitch-500 to-brand text-xs font-bold text-white">
                      LK
                    </div>
                    <div className="leading-tight">
                      <p className="font-medium">LiveKhela TV</p>
                      <p className="muted text-xs">Live sports • Free</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState title="No channels available" hint="Check the channel list file." />
            )}
          </div>

          {/* Mobile: recommendations live directly under the player */}
          <div className="mt-4 px-4 lg:hidden">
            <ChannelList
              channels={others}
              isLoading={isLoading}
              q={q}
              setQ={setQ}
              onPick={setActive}
            />
          </div>
        </div>

        {/* ── Secondary column: "up next" sidebar (desktop) ───────────── */}
        <aside className="hidden lg:block">
          <ChannelList
            channels={others}
            isLoading={isLoading}
            q={q}
            setQ={setQ}
            onPick={setActive}
          />
        </aside>
      </div>
    </div>
  );
}

function ChannelList({
  channels,
  isLoading,
  q,
  setQ,
  onPick,
}: {
  channels: Channel[];
  isLoading: boolean;
  q: string;
  setQ: (v: string) => void;
  onPick: (c: Channel) => void;
}) {
  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search channels…"
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-pitch-500 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-[94px] w-[168px] shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : channels.length === 0 ? (
        <EmptyState title="No channels found" hint="Try a different search." />
      ) : (
        <ul className="space-y-2">
          {channels.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onPick(c)}
                className="group flex w-full gap-3 rounded-xl p-1 text-left transition hover:bg-slate-100 active:scale-[0.99] dark:hover:bg-slate-800"
              >
                <Thumb
                  channel={c}
                  className="h-[94px] w-[168px] shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="line-clamp-2 font-medium leading-snug">{c.name}</p>
                  <p className="muted mt-1 truncate text-xs">LiveKhela TV</p>
                  <p className="muted flex items-center gap-1 text-xs">
                    <Tv className="h-3 w-3" /> Live now
                  </p>
                </div>
                <span className="my-auto hidden shrink-0 pr-2 text-slate-400 opacity-0 transition group-hover:opacity-100 lg:block">
                  <Play className="h-4 w-4 fill-current" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
