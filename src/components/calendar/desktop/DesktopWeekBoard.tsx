"use client";

import { addDays, format, isToday, startOfWeek } from "date-fns";
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
  jobSummary,
  jobsOnDate,
  jobTown,
  STATUS_SURFACE,
  toIsoDate,
  yearDaySignal,
} from "@/components/calendar/desktop/model";

const MARK_CLASS = {
  good: "text-green-700",
  alert: "text-amber-700",
  muted: "text-gray-400",
  bad: "text-red-600",
} as const;

export default function DesktopWeekBoard({
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
  const start = startOfWeek(cursor, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  return (
    <div className="grid h-full min-h-0 grid-cols-7 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
      {days.map((day) => {
        const today = isToday(day);
        const dayJobs = jobsOnDate(jobs, day);
        const total = bookedTotal(dayJobs);
        const signal = yearDaySignal(dayJobs);
        const iso = toIsoDate(day);
        const label = format(day, "EEEE, MMMM d");
        const weekend = day.getDay() === 0 || day.getDay() === 6;

        return (
          <section
            key={iso}
            className="group flex min-h-0 flex-col border-r border-gray-100 bg-white last:border-r-0"
          >
            <div className="flex shrink-0 items-start justify-between gap-1 border-b border-gray-100 px-2.5 pb-2 pt-2.5">
              <button
                type="button"
                onClick={() => onOpenDay(day)}
                aria-label={`Open ${label}`}
                className="min-w-0 rounded-lg text-left"
              >
                <span
                  className={`block text-[11px] font-medium uppercase tracking-[0.08em] ${
                    weekend ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {format(day, "EEE")}
                </span>
                <span
                  className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                    today ? "bg-brand-blue text-white" : "text-brand-black"
                  }`}
                >
                  {format(day, "d")}
                </span>
                <span
                  className="mt-1 block h-4 truncate text-[11px] font-semibold tabular-nums"
                  style={{ color: signal ? STATUS_SURFACE[signal].accent : undefined }}
                >
                  {total > 0 ? formatCurrency(total) : ""}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Schedule a job on ${label}`}
                onClick={() => {
                  const prefill = getNewJobTimePrefill(jobs, iso);
                  onAddJob(iso, prefill.startTime, prefill.endTime);
                }}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-300 opacity-0 transition hover:bg-brand-gray hover:text-brand-black group-hover:opacity-100 focus:opacity-100"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {dayJobs.map((job) => (
                <WeekJobCard key={job._id} job={job} jobs={jobs} onOpen={() => onOpenJob(job)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function WeekJobCard({ job, jobs, onOpen }: { job: Job; jobs: Job[]; onOpen: () => void }) {
  const name = getJobHouseholdTitle(job, jobs);
  const detail = [jobServiceLabel(job), jobTown(job)].filter(Boolean).join(" · ");
  const mark = jobStatusMark(job);
  const surface = STATUS_SURFACE[job.status] ?? STATUS_SURFACE.Scheduled;
  const cancelled = job.status === "Cancelled";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={jobSummary(job, name)}
      className="w-full rounded-xl border border-black/[0.04] px-2.5 py-2 text-left transition hover:brightness-[0.98]"
      style={{ backgroundColor: surface.bg, boxShadow: `inset 3px 0 0 ${surface.accent}` }}
    >
      <span className="block truncate text-[11px] font-semibold tabular-nums leading-4" style={{ color: surface.accent }}>
        {formatTimeRange(job.startTime, job.endTime)}
      </span>
      <span className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className={`min-w-0 truncate text-[13px] font-semibold leading-5 tracking-tight text-gray-900 ${cancelled ? "line-through" : ""}`}>
          {name}
        </span>
        {job.finalPrice !== undefined ? (
          <span className="shrink-0 text-[12px] font-semibold tabular-nums leading-5 text-gray-800">
            {formatCurrency(job.finalPrice)}
          </span>
        ) : null}
      </span>
      {detail || mark ? (
        <span className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[12px] leading-4 text-gray-500">{detail}</span>
          {mark ? (
            <span className={`shrink-0 text-[11px] font-medium ${MARK_CLASS[mark.tone]}`}>{mark.label}</span>
          ) : null}
        </span>
      ) : null}
    </button>
  );
}
