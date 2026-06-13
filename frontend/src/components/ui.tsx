import Link from "next/link";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import type { MatchStatus } from "@/lib/types";
import { isLive, statusLabel } from "@/lib/format";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="muted mt-1 text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <Inbox className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="font-medium">{title}</p>
      {hint && <p className="muted mt-1 max-w-md text-sm">{hint}</p>}
    </div>
  );
}

// Used wherever the API has no data for an optional feature (graceful fallback).
export function DataUnavailable({ feature }: { feature: string }) {
  return (
    <div className="card px-5 py-8 text-center">
      <p className="muted text-sm">
        {feature} are not available from the current data provider for this match.
      </p>
    </div>
  );
}

export function StatusBadge({ status, minute }: { status: MatchStatus; minute: number | null }) {
  if (isLive(status)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
        {statusLabel(status, minute)}
      </span>
    );
  }
  if (status === "FINISHED") {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        FT
      </span>
    );
  }
  return null;
}

export function Chip({
  active,
  children,
  href,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls = `whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
    active
      ? "bg-pitch-600 text-white"
      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
  }`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-pitch-600" />
    </div>
  );
}
