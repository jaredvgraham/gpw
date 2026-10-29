"use client";

import { format, isSameMonth, isToday } from "date-fns";
import { Plus } from "lucide-react";
import type { Job } from "@/types";
import { getNewJobTimePrefill } from "@/lib/calendar-mobile";
import { formatCurrency } from "@/lib/utils";
import { getJobHouseholdTitle } from "@/lib/household-display";
import {
  bookedTotal,
  jobSummary,
  jobsOnDate,
  monthGridDays,
  STATUS_SURFACE,
  toIsoDate,
  yearDaySignal,
} from "@/components/calendar/desktop/model";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shortTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = Number(hours) % 12 || 12;
  return `${hour}:${minutes}`;
}

export default function DesktopMonthBoard({
  cursor,
  jobs,
  onOpenDay,
  onOpenJob,
  onAddJob,
}: {
  cursor: Date;
  jobs: Job[];
  onOpenDay: (date: Date) => void;
  onOpenJob: (job: Job) => void;
  onAddJob: (jobDate: string, startTime: string, endTime: string) => void;
}) {
  const days = monthGridDays(cursor);
  const weeks = days.length / 7;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
      <div className="z-20 grid shrink-0 grid-cols-7 border-b border-brand-border bg-white">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`px-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.08em] ${
              index === 0 || index === 6 ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);
          const dayJobs = jobsOnDate(jobs, day);
          const total = bookedTotal(dayJobs);
          const signal = yearDaySignal(dayJobs);
          const iso = toIsoDate(day);
          const label = format(day, "EEEE, MMMM d");

          return (
            <div
              key={iso}
              data-today={today ? "true" : undefined}
            className={`group relative flex min-h-0 flex-col overflow-hidden border-b border-r border-gray-100 p-1.5 [&:nth-child(7n)]:border-r-0 ${
                inMonth ? "bg-white" : "bg-gray-50"
              }`}
            >
              <button
                type="button"
                aria-label={`Open ${label}`}
                onClick={() => onOpenDay(day)}
                className="absolute inset-0 z-0 cursor-pointer"
              />
              <div className="pointer-events-none relative z-10 flex items-center justify-between gap-2 px-1 pt-0.5">
                <span
                  className={`flex h-7 min-w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                    today
                      ? "bg-brand-blue text-white"
                      : inMonth
                        ? "text-brand-black"
                        : "text-gray-300"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <span className="flex items-center gap-1">
                  {total > 0 && signal ? (
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: STATUS_SURFACE[signal].accent }}>
                      {formatCurrency(total)}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label={`Schedule a job on ${label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      const prefill = getNewJobTimePrefill(jobs, iso);
                      onAddJob(iso, prefill.startTime, prefill.endTime);
                    }}
                    className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full text-gray-300 opacity-0 transition hover:bg-brand-gray hover:text-brand-black group-hover:opacity-100 focus:opacity-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <div className="pointer-events-none relative z-10 mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
                {dayJobs.map((job) => (
                  <MonthJobCard
                    key={job._id}
                    job={job}
                    jobs={jobs}
                    muted={!inMonth}
                    onOpen={() => onOpenJob(job)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthJobCard({
  job,
  jobs,
  muted,
  onOpen,
}: {
  job: Job;
  jobs: Job[];
  muted: boolean;
  onOpen: () => void;
}) {
  const name = getJobHouseholdTitle(job, jobs);
  const surface = STATUS_SURFACE[job.status] ?? STATUS_SURFACE.Scheduled;
  const cancelled = job.status === "Cancelled";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      aria-label={jobSummary(job, name)}
      className={`pointer-events-auto flex w-full items-center gap-1.5 rounded-md py-0.5 pl-1.5 pr-1 text-left transition hover:brightness-[0.98] ${
        muted ? "opacity-50" : ""
      }`}
      style={{ backgroundColor: surface.bg, boxShadow: `inset 2px 0 0 ${surface.accent}` }}
    >
      <span className="w-8 shrink-0 text-[11px] font-semibold tabular-nums leading-4" style={{ color: surface.accent }}>
        {shortTime(job.startTime)}
      </span>
      <span className={`min-w-0 flex-1 truncate text-[12px] font-medium leading-4 text-gray-900 ${cancelled ? "line-through" : ""}`}>
        {name}
      </span>
      {job.finalPrice !== undefined ? (
        <span className="shrink-0 text-[11px] font-medium tabular-nums leading-4 text-gray-400">
          {formatCurrency(job.finalPrice)}
        </span>
      ) : null}
    </button>
  );
}
