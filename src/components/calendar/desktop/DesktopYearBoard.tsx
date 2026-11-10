"use client";

import { format, getDay, getDaysInMonth, isToday } from "date-fns";
import type { Job } from "@/types";
import { getJobDateOnly } from "@/lib/dates";
import { formatCurrency } from "@/lib/utils";
import { dayCueColor } from "@/lib/constants";
import {
  bookedTotal,
  jobsOnDate,
  toIsoDate,
} from "@/components/calendar/desktop/model";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function DesktopYearBoard({
  cursor,
  jobs,
  onOpenDay,
  onOpenMonth,
  duo = false,
}: {
  cursor: Date;
  jobs: Job[];
  onOpenDay: (date: Date) => void;
  onOpenMonth: (date: Date) => void;
  duo?: boolean;
}) {
  const year = cursor.getFullYear();
  const months = Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));

  function renderMonth(month: Date) {
    const daysInMonth = getDaysInMonth(month);
    const lead = getDay(month);
    const monthIso = format(month, "yyyy-MM");
    const inMonth = jobs.filter((job) => getJobDateOnly(job.jobDate).startsWith(monthIso));
    const total = bookedTotal(inMonth);
    const cue = dayCueColor(inMonth);

    return (
      <section
        key={monthIso}
        className={`bg-white ring-1 ring-gray-200 ${duo ? "rounded-xl p-3" : "rounded-2xl p-4"}`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenMonth(month)}
            className="text-sm font-semibold tracking-tight text-brand-black transition hover:text-brand-blue"
          >
            {format(month, "MMMM")}
          </button>
          {total > 0 ? (
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: cue ?? undefined }}
            >
              {formatCurrency(total)}
            </span>
          ) : (
            <span className="text-[11px] text-gray-300">—</span>
          )}
        </div>
        <div className={`grid grid-cols-7 ${duo ? "mt-2 gap-y-0.5" : "mt-3 gap-y-1"}`}>
          {WEEKDAYS.map((label, index) => (
            <div key={`${monthIso}-${label}-${index}`} className="text-center text-[10px] font-medium tracking-wide text-gray-400">
              {label}
            </div>
          ))}
          {Array.from({ length: lead }, (_, index) => (
            <div key={`${monthIso}-pad-${index}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = new Date(year, month.getMonth(), index + 1);
            const dayJobs = jobsOnDate(jobs, day);
            const signal = dayCueColor(dayJobs);
            const today = isToday(day);
            const summary =
              dayJobs.length > 0
                ? `${format(day, "MMMM d")}, ${dayJobs.length} ${dayJobs.length === 1 ? "job" : "jobs"}, ${formatCurrency(bookedTotal(dayJobs))}`
                : format(day, "MMMM d");

            return (
              <button
                key={toIsoDate(day)}
                type="button"
                title={summary}
                aria-label={summary}
                onClick={() => onOpenDay(day)}
                className={`relative flex items-center justify-center ${duo ? "h-7" : "h-8"}`}
              >
                <span
                  className={`flex items-center justify-center rounded-full tabular-nums transition ${
                    duo ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-[12px]"
                  } ${
                    today ? "bg-brand-blue font-semibold text-white" : signal ? "font-semibold hover:bg-gray-100" : "text-gray-400 hover:bg-gray-100"
                  }`}
                  style={!today && signal ? { color: signal } : undefined}
                >
                  {index + 1}
                </span>
                {signal ? (
                  <span
                    className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: today ? "#ffffff" : signal }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (duo) {
    return (
      <div className="duo-panes h-full min-h-0 overflow-hidden bg-brand-gray">
        <div className="grid h-full min-h-0 grid-cols-2 content-start gap-3 overflow-auto p-3">
          {months.slice(0, 6).map(renderMonth)}
        </div>
        <div className="grid h-full min-h-0 grid-cols-2 content-start gap-3 overflow-auto p-3">
          {months.slice(6).map(renderMonth)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-auto">
      <div className="grid grid-cols-3 gap-4 pb-2">{months.map(renderMonth)}</div>
    </div>
  );
}
