"use client";

import { useEffect } from "react";
import { format, isSameMonth, isToday } from "date-fns";
import { Plus } from "lucide-react";
import type { Job } from "@/types";
import { getNewJobTimePrefill } from "@/lib/calendar-mobile";
import { formatCurrency } from "@/lib/utils";
import { getJobHouseholdTitle } from "@/lib/household-display";
import {
  bookedTotal,
  formatTimeRange,
  jobServiceLabel,
  jobStatusMark,
  jobTown,
  jobSummary,
  jobsOnDate,
  monthGridDays,
  STATUS_SURFACE,
  toIsoDate,
  yearDaySignal,
} from "@/components/calendar/desktop/model";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MARK_CLASS = {
  good: "text-green-700",
  alert: "text-amber-700",
  muted: "text-gray-400",
  bad: "text-red-600",
} as const;

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

  useEffect(() => {
    const todayCell = document.querySelector("[data-today='true']");
    todayCell?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <div className="h-full min-h-0 overflow-auto rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.06]">
      <div className="sticky top-0 z-20 grid grid-cols-7 border-b border-brand-border bg-white/95 backdrop-blur-sm">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 ${
              index === 0 || index === 6 ? "text-gray-300" : ""
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
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
            className={`group relative flex min-h-[8.5rem] flex-col border-b border-r border-gray-100 p-1.5 [&:nth-child(7n)]:border-r-0 ${
                today ? "bg-[#eff6ff]" : inMonth ? "bg-white" : "bg-[#fafafa]"
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
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: STATUS_SURFACE[signal].muted }}
                    >
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
              <div className="pointer-events-none relative z-10 mt-1 flex flex-col gap-1">
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
  const services = jobServiceLabel(job);
  const town = jobTown(job);
  const mark = jobStatusMark(job);
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
      className={`pointer-events-auto w-full rounded-lg border px-2 py-1.5 pl-2.5 text-left transition hover:brightness-[0.98] ${
        muted ? "opacity-70" : ""
      }`}
      style={{
        backgroundColor: surface.bg,
        borderColor: surface.border,
        boxShadow: `inset 4px 0 0 ${surface.accent}`,
      }}
    >
      <span
        className={`block truncate text-[13px] font-semibold leading-tight ${
          cancelled ? "line-through" : ""
        }`}
        style={{ color: surface.ink }}
      >
        {name}
      </span>
      {services ? (
        <span className="mt-0.5 block text-[12px] font-semibold leading-snug" style={{ color: surface.ink }}>
          {services}
        </span>
      ) : null}
      <span className="mt-0.5 block truncate text-[11px] font-semibold tabular-nums" style={{ color: surface.muted }}>
        {formatTimeRange(job.startTime, job.endTime)}
      </span>
      {town ? (
        <span className="mt-0.5 block truncate text-[11px] leading-tight" style={{ color: surface.ink, opacity: 0.65 }}>
          {town}
        </span>
      ) : null}
      {job.finalPrice !== undefined || mark ? (
        <span className="mt-1 flex items-baseline justify-between gap-2">
          {job.finalPrice !== undefined ? (
            <span className="truncate text-[12px] font-semibold tabular-nums" style={{ color: surface.ink }}>
              {formatCurrency(job.finalPrice)}
            </span>
          ) : (
            <span />
          )}
          {mark ? (
            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide ${MARK_CLASS[mark.tone]}`}>
              {mark.label}
            </span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}
