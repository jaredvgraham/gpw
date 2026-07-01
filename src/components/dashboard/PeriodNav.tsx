"use client";

import { addMonths, format, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_LABELS, WEEKS_PER_MONTH, getMonthWeekIndex } from "@/lib/dashboard-stats";

type PeriodView = "year" | "month" | "week";

const VIEW_LABELS: Record<PeriodView, string> = {
  year: "Year",
  month: "Month",
  week: "Week",
};

export function PeriodViewToggle({
  value,
  onChange,
}: {
  value: PeriodView;
  onChange: (mode: PeriodView) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-brand-border bg-brand-gray/50 p-1">
      {(["year", "month", "week"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            value === mode
              ? "bg-white text-brand-blue shadow-sm"
              : "text-gray-600 hover:text-brand-black"
          }`}
        >
          {VIEW_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}

export function YearSelector({
  years,
  value,
  onChange,
}: {
  years: number[];
  value: number;
  onChange: (year: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2">
      <CalendarDays className="h-4 w-4 text-brand-blue shrink-0" />
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="bg-transparent text-sm font-semibold text-brand-black outline-none"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MonthNavigator({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const current = new Date(year, month - 1, 1);

  const goPrev = () => {
    const prev = subMonths(current, 1);
    onChange(prev.getFullYear(), prev.getMonth() + 1);
  };

  const goNext = () => {
    const next = addMonths(current, 1);
    onChange(next.getFullYear(), next.getMonth() + 1);
  };

  return (
    <div className="inline-flex items-center rounded-xl border border-brand-border bg-white overflow-hidden">
      <button
        type="button"
        onClick={goPrev}
        className="p-2.5 text-gray-600 hover:bg-brand-gray transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <select
        value={month}
        onChange={(event) => onChange(year, Number(event.target.value))}
        className="border-x border-brand-border bg-transparent px-3 py-2.5 text-sm font-semibold text-brand-black outline-none min-w-[120px] text-center"
      >
        {MONTH_LABELS.map((label, index) => (
          <option key={label} value={index + 1}>
            {label} {year}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={goNext}
        className="p-2.5 text-gray-600 hover:bg-brand-gray transition-colors"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function WeekNavigator({
  year,
  month,
  weekIndex,
  onChange,
}: {
  year: number;
  month: number;
  weekIndex: number;
  onChange: (year: number, month: number, weekIndex: number) => void;
}) {
  const goPrev = () => {
    if (weekIndex > 1) {
      onChange(year, month, weekIndex - 1);
      return;
    }
    const prev = subMonths(new Date(year, month - 1, 1), 1);
    onChange(prev.getFullYear(), prev.getMonth() + 1, WEEKS_PER_MONTH);
  };

  const goNext = () => {
    if (weekIndex < WEEKS_PER_MONTH) {
      onChange(year, month, weekIndex + 1);
      return;
    }
    const next = addMonths(new Date(year, month - 1, 1), 1);
    onChange(next.getFullYear(), next.getMonth() + 1, 1);
  };

  const goThisWeek = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayDate = new Date(`${today}T12:00:00`);
    onChange(todayDate.getFullYear(), todayDate.getMonth() + 1, getMonthWeekIndex(today));
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center rounded-xl border border-brand-border bg-white overflow-hidden">
        <button
          type="button"
          onClick={goPrev}
          className="p-2.5 text-gray-600 hover:bg-brand-gray transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="border-x border-brand-border px-4 py-2.5 text-sm font-semibold text-brand-black whitespace-nowrap">
          Week {weekIndex} <span className="text-gray-400 font-normal">of {WEEKS_PER_MONTH}</span>
        </span>
        <button
          type="button"
          onClick={goNext}
          className="p-2.5 text-gray-600 hover:bg-brand-gray transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={goThisWeek}
        className="rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-brand-gray transition-colors"
      >
        This week
      </button>
    </div>
  );
}
