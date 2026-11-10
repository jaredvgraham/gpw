"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Menu, Plus } from "lucide-react";
import { DESKTOP_VIEWS, type DesktopView } from "@/components/calendar/desktop/model";

export interface CalendarStat {
  value: string;
  label: string;
  tone?: "alert" | "good" | "muted" | "due";
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
  layoutToggle,
  duo = false,
  onMenuOpen,
  onAddJob,
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
  layoutToggle?: ReactNode;
  duo?: boolean;
  onMenuOpen?: () => void;
  onAddJob?: () => void;
}) {
  const title = (
    <h1
      className={`relative truncate font-semibold leading-none tracking-tight text-brand-black ${
        duo ? "ml-1 text-xl" : "ml-2 text-[1.7rem]"
      }`}
    >
      {primary}
      {secondary ? (
        <span className={`ml-2 font-medium text-gray-400 ${duo ? "text-xl" : "text-[1.7rem]"}`}>{secondary}</span>
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
  );

  const statsRow = (
    <>
      {stats.length === 0 ? (
        <p className="text-sm text-gray-400">Nothing booked</p>
      ) : (
        stats.map((stat, index) => (
          <span key={stat.label} className="inline-flex items-baseline gap-1.5">
            {index > 0 ? (
              <span aria-hidden="true" className="text-gray-300">
                ·
              </span>
            ) : null}
            <span
              className={`font-semibold tabular-nums ${duo ? "text-xs" : "text-sm"} ${
                stat.tone === "alert"
                  ? "text-amber-700"
                  : stat.tone === "due"
                    ? "text-yellow-700"
                    : stat.tone === "good"
                      ? "text-green-700"
                      : stat.tone === "muted"
                        ? "text-gray-400"
                        : "text-brand-black"
              }`}
            >
              {stat.value}
            </span>
            <span className={`text-gray-500 ${duo ? "text-xs" : "text-sm"}`}>{stat.label}</span>
          </span>
        ))
      )}
    </>
  );

  const viewPills = (
    <div className="inline-flex shrink-0 rounded-full bg-white p-1 ring-1 ring-gray-200">
      {DESKTOP_VIEWS.map(({ view: next, label }) => {
        const active = view === next;
        return (
          <button
            key={next}
            type="button"
            onClick={() => onView(next)}
            aria-pressed={active}
            className={`rounded-full font-semibold transition ${
              duo ? "min-h-10 px-3.5 text-sm" : "px-3.5 py-1.5 text-sm"
            } ${active ? "bg-brand-black text-white" : "text-gray-500 hover:text-brand-black"}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );

  if (duo) {
    return (
      <div className="duo-panes duo-panes-bar shrink-0 border-b border-brand-border bg-white">
        <div className="flex min-w-0 items-center gap-1.5 px-3 py-2">
          {onMenuOpen ? (
            <button
              type="button"
              onClick={onMenuOpen}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-700 active:bg-brand-gray"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2.5} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrev}
            aria-label={prevLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brand-black active:bg-brand-gray"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label={nextLabel}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-brand-black active:bg-brand-gray"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              {title}
              <button
                type="button"
                onClick={onToday}
                disabled={todayDisabled}
                className="shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold text-brand-blue active:bg-brand-gray disabled:text-gray-300"
              >
                Today
              </button>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">{statsRow}</div>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 px-3 py-2">
          {layoutToggle}
          {viewPills}
          {onAddJob ? (
            <button
              type="button"
              onClick={onAddJob}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-red text-white shadow-sm active:bg-red-700"
              aria-label="Add job"
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

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
          {title}
          <button
            type="button"
            onClick={onToday}
            disabled={todayDisabled}
            className="ml-3 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-blue transition hover:bg-white disabled:cursor-default disabled:text-gray-300 disabled:hover:bg-transparent"
          >
            Today
          </button>
        </div>
        <div className="mt-2.5 flex min-h-5 flex-wrap items-baseline gap-x-3 gap-y-1 pl-[4.75rem]">{statsRow}</div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {layoutToggle}
        {viewPills}
      </div>
    </div>
  );
}
