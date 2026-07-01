"use client";

import { ChevronRight } from "lucide-react";
import { MONTH_LABELS } from "@/lib/dashboard-stats";

type ViewMode = "year" | "month" | "week";

export default function InsightsBreadcrumb({
  view,
  year,
  month,
  monthWeek,
  onNavigate,
}: {
  view: ViewMode;
  year: number;
  month: number;
  monthWeek: number;
  onNavigate: (target: ViewMode) => void;
}) {
  const monthLabel = `${MONTH_LABELS[month - 1]} ${year}`;

  return (
    <nav aria-label="Insights period" className="flex flex-wrap items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => onNavigate("year")}
        className={`rounded-md px-2 py-1 font-medium transition-colors ${
          view === "year"
            ? "bg-blue-50 text-brand-blue"
            : "text-gray-600 hover:bg-brand-gray hover:text-brand-black"
        }`}
      >
        {year}
      </button>

      {view !== "year" && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <button
            type="button"
            onClick={() => onNavigate("month")}
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              view === "month"
                ? "bg-blue-50 text-brand-blue"
                : "text-gray-600 hover:bg-brand-gray hover:text-brand-black"
            }`}
          >
            {monthLabel}
          </button>
        </>
      )}

      {view === "week" && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-brand-blue">
            Week {monthWeek}
          </span>
        </>
      )}
    </nav>
  );
}
