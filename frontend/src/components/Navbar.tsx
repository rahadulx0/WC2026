"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, Trophy } from "lucide-react";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/fixtures", label: "Fixtures" },
  { href: "/standings", label: "Standings" },
  { href: "/bracket", label: "Bracket" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/venues", label: "Venues" },
  { href: "/stats", label: "Stats" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          <Trophy className="h-5 w-5 text-pitch-600" />
          <span className="hidden sm:inline">
            WC<span className="text-pitch-600">2026</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive(l.href)
                  ? "bg-slate-100 text-pitch-600 dark:bg-slate-800"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden md:block">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search teams, players…"
            className="w-44 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm outline-none transition focus:w-60 focus:border-pitch-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </form>

        <button
          onClick={() => setOpen((o) => !o)}
          className="ml-auto rounded-lg border border-slate-200 p-2 md:ml-0 lg:hidden dark:border-slate-700"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 px-4 py-2 lg:hidden dark:border-slate-800">
          <div className="grid grid-cols-2 gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive(l.href)
                    ? "bg-slate-100 text-pitch-600 dark:bg-slate-800"
                    : "text-slate-600 dark:text-slate-300"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <form onSubmit={submitSearch} className="mt-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </form>
        </div>
      )}
    </header>
  );
}
