"use client";

import { format, getDay, getDaysInMonth, isToday } from "date-fns";
import type { Job } from "@/types";
import { getJobDateOnly } from "@/lib/dates";
import { formatCurrency } from "@/lib/utils";
import {
  bookedTotal,
  jobsOnDate,
  STATUS_SURFACE,
  toIsoDate,
  yearDaySignal,
} from "@/components/calendar/desktop/model";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function DesktopYearBoard({
  cursor,
  jobs,
  onOpenDay,
  onOpenMonth,
}: {
  cursor: Date;
  jobs: Job[];
  onOpenDay: (date: Date) => void;
  onOpenMonth: (date: Date) => void;
}) {
  const year = cursor.getFullYear();
  const months = Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));

  return (
    <div className="h-full min-h-0 overflow-auto">
      <div className="grid grid-cols-3 gap-4 pb-2">
        {months.map((month) => {
          const daysInMonth = getDaysInMonth(month);
          const lead = getDay(month);
          const monthIso = format(month, "yyyy-MM");
          const inMonth = jobs.filter((job) => getJobDateOnly(job.jobDate).startsWith(monthIso));
          const total = bookedTotal(inMonth);
          const monthSignal = yearDaySignal(inMonth);

          return (
            <section
              key={monthIso}
              className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.06]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onOpenMonth(month)}
                  className="text-sm font-semibold tracking-tight text-brand-black transition hover:text-brand-blue"
                >
                  {format(month, "MMMM")}
                </button>
                {total > 0 && monthSignal ? (
                  <span
                    className="text-[11px] font-semibold tabular-nums"
                    style={{ color: STATUS_SURFACE[monthSignal].muted }}
                  >
                    {formatCurrency(total)}
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-300">—</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-y-1">
                {WEEKDAYS.map((label, index) => (
                  <div key={`${monthIso}-${label}-${index}`} className="text-center text-[10px] font-semibold text-gray-300">
                    {label}
                  </div>
                ))}
                {Array.from({ length: lead }, (_, index) => (
                  <div key={`${monthIso}-pad-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                  const day = new Date(year, month.getMonth(), index + 1);
                  const dayJobs = jobsOnDate(jobs, day);
                  const signal = yearDaySignal(dayJobs);
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
                      className="relative flex h-8 items-center justify-center"
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] tabular-nums transition ${
                          today ? "bg-brand-blue font-semibold text-white" : signal ? "font-semibold" : "text-gray-400 hover:bg-brand-gray"
                        }`}
                        style={
                          !today && signal
                            ? { backgroundColor: STATUS_SURFACE[signal].bg, color: STATUS_SURFACE[signal].ink }
                            : undefined
                        }
                      >
                        {index + 1}
                      </span>
                      {signal ? (
                        <span
                          className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                          style={{ backgroundColor: today ? "#ffffff" : STATUS_SURFACE[signal].accent }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
