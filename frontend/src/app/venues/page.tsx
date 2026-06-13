"use client";

import { Building2, Goal, Users } from "lucide-react";
import { PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/hooks";
import type { Venue } from "@/lib/types";

export default function VenuesPage() {
  const { data, isLoading } = useApi<Venue[]>("/venues");

  return (
    <div>
      <PageHeader title="Venues" subtitle="16 host stadiums across the USA, Canada and Mexico" />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((v) => (
            <div key={v.id} className="card overflow-hidden">
              <div className="flex h-24 items-center justify-center bg-gradient-to-br from-brand to-pitch-600 text-white">
                <Building2 className="h-10 w-10" />
              </div>
              <div className="px-4 py-3">
                <h2 className="font-semibold">{v.name}</h2>
                <p className="muted text-sm">
                  {v.city}
                  {v.country ? `, ${v.country}` : ""}
                </p>
                <div className="muted mt-2 flex gap-4 text-xs">
                  {v.capacity != null && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {v.capacity.toLocaleString()}
                    </span>
                  )}
                  {v.matchesHosted != null && (
                    <span className="flex items-center gap-1">
                      <Goal className="h-3.5 w-3.5" /> {v.matchesHosted} hosted
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
