"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DESKTOP_VIEWS, type DesktopView } from "@/components/calendar/desktop/model";

export interface CalendarStat {
  value: string;
  label: string;
  tone?: "alert" | "good" | "muted";
}

export default function DesktopCalendarChrome({
  primary,
  secondary,
  stats,
  view,
  onView,
  onPrev,
  onNext,
  onToday,
  todayDisabled,
  prevLabel,
  nextLabel,
  jump,
}: {
  primary: string;
  secondary?: string;
  stats: CalendarStat[];
  view: DesktopView;
  onView: (view: DesktopView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  todayDisabled: boolean;
  prevLabel: string;
  nextLabel: string;
  jump?: { kind: "month" | "date"; value: string; label: string; onChange: (value: string) => void };
}) {
  return (
    <div className="mb-4 flex shrink-0 items-end justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            aria-label={prevLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-black transition hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label={nextLabel}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-black transition hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <h1 className="relative ml-2 truncate text-[1.7rem] font-semibold leading-none tracking-tight text-brand-black">
            {primary}
            {secondary ? (
              <span className="ml-2 text-[1.7rem] font-medium text-gray-400">{secondary}</span>
            ) : null}
            {jump ? (
              <input
                type={jump.kind}
                value={jump.value}
                aria-label={jump.label}
                onChange={(event) => {
                  if (event.target.value) jump.onChange(event.target.value);
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            ) : null}
          </h1>
          <button
            type="button"
            onClick={onToday}
            disabled={todayDisabled}
            className="ml-3 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-blue transition hover:bg-white disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent"
          >
            Today
          </button>
        </div>
        <div className="mt-3 flex min-h-5 flex-wrap items-baseline gap-x-4 gap-y-1 pl-[4.75rem]">
          {stats.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing booked</p>
          ) : (
            stats.map((stat) => (
              <span key={stat.label} className="inline-flex items-baseline gap-1.5">
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    stat.tone === "alert"
                      ? "text-amber-700"
                      : stat.tone === "good"
                        ? "text-green-700"
                        : stat.tone === "muted"
                          ? "text-gray-400"
                          : "text-brand-black"
                  }`}
                >
                  {stat.value}
                </span>
                <span className="text-sm text-gray-500">{stat.label}</span>
              </span>
            ))
          )}
        </div>
      </div>

      <div className="inline-flex shrink-0 rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.06]">
        {DESKTOP_VIEWS.map(({ view: next, label }) => {
          const active = view === next;
          return (
            <button
              key={next}
              type="button"
              onClick={() => onView(next)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                active ? "bg-brand-black text-white" : "text-gray-500 hover:text-brand-black"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
