import { Gift, Trophy } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 py-8 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500">
        <p className="flex items-center justify-center gap-1.5">
          <Trophy className="h-4 w-4 text-pitch-600" />
          FIFA World Cup 2026 Live Center · June 11 – July 19, 2026 · USA · Canada · Mexico
        </p>
        <p className="mt-2 flex items-center justify-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
          <Gift className="h-4 w-4 text-pitch-600" />
          A gift to football fans from Intech Solution.
        </p>
      </div>
    </footer>
  );
}
