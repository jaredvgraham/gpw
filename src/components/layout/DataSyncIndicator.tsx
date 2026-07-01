"use client";

import { format } from "date-fns";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { useAppData } from "@/contexts/AppDataContext";

interface DataSyncIndicatorProps {
  className?: string;
}

export default function DataSyncIndicator({ className = "" }: DataSyncIndicatorProps) {
  const { isSyncing, lastSyncedAt, refreshAll } = useAppData();

  return (
    <div
      className={`flex items-center justify-between gap-2 border-b border-brand-border/70 bg-white px-3 py-1.5 text-[11px] text-gray-500 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {isSyncing ? (
          <>
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-brand-blue" />
            <span>Updating schedule...</span>
          </>
        ) : lastSyncedAt ? (
          <>
            <Check className="h-3 w-3 shrink-0 text-green-600" />
            <span className="truncate">
              Up to date · {format(lastSyncedAt, "h:mm a")}
            </span>
          </>
        ) : (
          <span>Loading schedule...</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => refreshAll(true)}
        disabled={isSyncing}
        className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-brand-blue active:bg-brand-gray disabled:opacity-50"
        aria-label="Refresh now"
      >
        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </div>
  );
}
