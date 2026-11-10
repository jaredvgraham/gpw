"use client";

import { format, isSameMonth, isToday } from "date-fns";
import { Plus } from "lucide-react";
import type { Job } from "@/types";
import { getNewJobTimePrefill } from "@/lib/calendar-mobile";
import { formatCurrency } from "@/lib/utils";
import { getJobHouseholdTitle } from "@/lib/household-display";
import { dayCueColor, jobCueColor } from "@/lib/constants";
import {
  bookedTotal,
  jobSummary,
  jobsOnDate,
  monthGridDays,
  toIsoDate,
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
  duo = false,
}: {
  cursor: Date;
  jobs: Job[];
  onOpenDay: (date: Date) => void;
  onOpenJob: (job: Job) => void;
  onAddJob: (jobDate: string, startTime: string, endTime: string) => void;
  duo?: boolean;
}) {
  const days = monthGridDays(cursor);
  const weekCount = days.length / 7;
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function renderDay(day: Date, lastColClass: string) {
    const inMonth = isSameMonth(day, cursor);
    const today = isToday(day);
    const dayJobs = jobsOnDate(jobs, day);
    const total = bookedTotal(dayJobs);
    const signal = dayCueColor(dayJobs);
    const iso = toIsoDate(day);
    const label = format(day, "EEEE, MMMM d");

    return (
      <div
        key={iso}
        data-today={today ? "true" : undefined}
        className={`group relative flex min-h-0 flex-col overflow-hidden border-b border-r border-gray-100 ${
          duo ? "p-1" : "p-1.5"
        } ${lastColClass} ${inMonth ? "bg-white" : "bg-gray-50"}`}
      >
        <button
          type="button"
          aria-label={`Open ${label}`}
          onClick={() => onOpenDay(day)}
          className="absolute inset-0 z-0 cursor-pointer"
        />
        <div className="pointer-events-none relative z-10 flex items-center justify-between gap-1 px-0.5 pt-0.5">
          <span
            className={`flex items-center justify-center rounded-full font-semibold tabular-nums ${
              duo ? "h-6 min-w-6 text-[13px]" : "h-7 min-w-7 text-sm"
            } ${today ? "bg-brand-blue text-white" : inMonth ? "text-brand-black" : "text-gray-300"}`}
          >
            {format(day, "d")}
          </span>
          <span className="flex min-w-0 items-center gap-1">
            {total > 0 && signal ? (
              <span
                className={`font-semibold tabular-nums ${duo ? "truncate text-[10px]" : "text-[11px]"}`}
                style={{ color: signal }}
              >
                {formatCurrency(total)}
              </span>
            ) : null}
            {duo ? null : (
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
            )}
          </span>
        </div>
        <div className="pointer-events-none relative z-10 mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {dayJobs.map((job) => (
            <MonthJobCard
              key={job._id}
              job={job}
              jobs={jobs}
              muted={!inMonth}
              dense={duo}
              onOpen={() => onOpenJob(job)}
            />
          ))}
        </div>
      </div>
    );
  }

  function pane(weekdays: string[], slice: (week: Date[]) => Date[], colsClass: string, lastColClass: string) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <div className={`z-20 grid shrink-0 ${colsClass} border-b border-brand-border bg-white`}>
          {weekdays.map((day) => (
            <div
              key={day}
              className={`px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] ${
                day === "Sun" || day === "Sat" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        <div
          className={`grid min-h-0 flex-1 ${colsClass}`}
          style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
        >
          {weeks.flatMap((week) => slice(week).map((day) => renderDay(day, lastColClass)))}
        </div>
      </div>
    );
  }

  if (duo) {
    return (
      <div className="duo-panes h-full min-h-0 overflow-hidden">
        {pane(WEEKDAYS.slice(0, 4), (week) => week.slice(0, 4), "grid-cols-4", "[&:nth-child(4n)]:border-r-0")}
        {pane(WEEKDAYS.slice(4), (week) => week.slice(4), "grid-cols-3", "[&:nth-child(3n)]:border-r-0")}
      </div>
    );
  }

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
        style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
      >
        {days.map((day) => renderDay(day, "[&:nth-child(7n)]:border-r-0"))}
      </div>
    </div>
  );
}

function MonthJobCard({
  job,
  jobs,
  muted,
  dense,
  onOpen,
}: {
  job: Job;
  jobs: Job[];
  muted: boolean;
  dense?: boolean;
  onOpen: () => void;
}) {
  const name = getJobHouseholdTitle(job, jobs);
  const accent = jobCueColor(job);
  const cancelled = job.status === "Cancelled";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      aria-label={jobSummary(job, name)}
      className={`pointer-events-auto flex w-full items-center bg-white text-left ${
        dense ? "gap-1 rounded py-px pl-1 pr-0.5" : "gap-1.5 rounded-md py-0.5 pl-1.5 pr-1"
      } ${muted ? "opacity-50" : ""}`}
      style={dense ? undefined : { boxShadow: `inset 2px 0 0 ${accent}` }}
    >
      {dense ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      ) : null}
      <span className={`shrink-0 font-semibold tabular-nums leading-4 text-gray-600 ${dense ? "w-7 text-[10px]" : "w-8 text-[11px]"}`}>
        {shortTime(job.startTime)}
      </span>
      <span
        className={`min-w-0 flex-1 truncate font-medium leading-4 text-brand-black ${
          dense ? "text-[11px]" : "text-[12px]"
        } ${cancelled ? "line-through" : ""}`}
      >
        {name}
      </span>
      {!dense && job.finalPrice !== undefined ? (
        <span className="shrink-0 text-[11px] font-medium tabular-nums leading-4 text-gray-400">
          {formatCurrency(job.finalPrice)}
        </span>
      ) : null}
    </button>
  );
}
