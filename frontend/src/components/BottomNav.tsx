"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Home,
  ListOrdered,
  MapPin,
  Menu,
  Network,
  Search,
  Tv,
  User,
  Users,
  X,
} from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/channels", label: "Live TV", icon: Tv },
  { href: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { href: "/bracket", label: "Bracket", icon: Network },
];

const MORE = [
  { href: "/standings", label: "Standings", icon: ListOrdered },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/players", label: "Players", icon: User },
  { href: "/venues", label: "Venues", icon: MapPin },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/search", label: "Search", icon: Search },
];

export function BottomNav() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);

  // Close the sheet whenever the route changes.
  useEffect(() => setSheet(false), [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const moreActive = MORE.some((m) => isActive(m.href));

  return (
    <>
      {/* "More" slide-up sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Close"
            onClick={() => setSheet(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_.15s_ease]"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl animate-[sheetUp_.22s_cubic-bezier(.32,.72,0,1)] dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">More</h2>
              <button
                onClick={() => setSheet(false)}
                className="rounded-full p-1.5 text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MORE.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl p-4 text-xs font-medium transition active:scale-95 ${
                    isActive(m.href)
                      ? "bg-pitch-50 text-pitch-700 dark:bg-pitch-600/15 dark:text-pitch-300"
                      : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <m.icon className="h-6 w-6" />
                  {m.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {TABS.map((tab) => (
            <Tab key={tab.href} href={tab.href} label={tab.label} Icon={tab.icon} active={isActive(tab.href)} />
          ))}
          <button
            onClick={() => setSheet(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition active:scale-90 ${
              moreActive || sheet ? "text-pitch-600" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Menu className="h-[22px] w-[22px]" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}

function Tab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition active:scale-90 ${
        active ? "text-pitch-600" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
      {label}
    </Link>
  );
}
