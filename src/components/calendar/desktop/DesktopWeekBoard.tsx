"use client";

import { addDays, format, isToday, startOfWeek } from "date-fns";
import { Plus } from "lucide-react";
import CopyAddressButton from "@/components/ui/CopyAddressButton";
import type { Job } from "@/types";
import {
  formatDurationShort,
  getJobDurationMinutes,
  getJobServiceEntries,
  getNewJobTimePrefill,
} from "@/lib/calendar-mobile";
import { formatCurrency, getJobAddress } from "@/lib/utils";
import { getJobHouseholdTitle } from "@/lib/household-display";
import { dayCueColor, jobCueColor } from "@/lib/constants";
import ServicePill from "@/components/calendar/ServicePill";
import StatusCue from "@/components/calendar/StatusCue";
import {
  bookedTotal,
  formatTimeRange,
  jobSummary,
  jobsOnDate,
  toIsoDate,
} from "@/components/calendar/desktop/model";

export default function DesktopWeekBoard({
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
  const start = startOfWeek(cursor, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  function renderColumn(day: Date) {
    return (
      <WeekDayColumn
        key={toIsoDate(day)}
        day={day}
        jobs={jobs}
        compact={false}
        onOpenDay={onOpenDay}
        onOpenJob={onOpenJob}
        onAddJob={onAddJob}
      />
    );
  }

  if (duo) {
    const weekJobs = days.flatMap((day) => jobsOnDate(jobs, day));
    const iso = toIsoDate(days[0]);
    return (
      <div className="duo-panes h-full min-h-0 overflow-hidden">
        <div className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-px bg-gray-200">
          {days.slice(0, 4).map((day) => (
            <WeekDayColumn
              key={toIsoDate(day)}
              day={day}
              jobs={jobs}
              compact
              onOpenDay={onOpenDay}
              onOpenJob={onOpenJob}
              onAddJob={onAddJob}
            />
          ))}
        </div>
        <div className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-px bg-gray-200">
          {days.slice(4).map((day) => (
            <WeekDayColumn
              key={toIsoDate(day)}
              day={day}
              jobs={jobs}
              compact
              onOpenDay={onOpenDay}
              onOpenJob={onOpenJob}
              onAddJob={onAddJob}
            />
          ))}
          <div className="flex min-h-0 flex-col justify-center gap-3 bg-white px-5">
            <p className="text-2xl font-semibold tracking-tight text-brand-black">
              {weekJobs.length} {weekJobs.length === 1 ? "job" : "jobs"}
            </p>
            <p className="text-sm text-gray-500">
              {weekJobs.length > 0 ? `${formatCurrency(bookedTotal(weekJobs))} booked this week` : "Nothing booked this week"}
            </p>
            <button
              type="button"
              onClick={() => {
                const prefill = getNewJobTimePrefill(jobs, iso);
                onAddJob(iso, prefill.startTime, prefill.endTime);
              }}
              className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white active:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Schedule a job
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-7 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
      {days.map(renderColumn)}
    </div>
  );
}

function WeekDayColumn({
  day,
  jobs,
  compact,
  onOpenDay,
  onOpenJob,
  onAddJob,
}: {
  day: Date;
  jobs: Job[];
  compact: boolean;
  onOpenDay: (date: Date) => void;
  onOpenJob: (job: Job) => void;
  onAddJob: (jobDate: string, startTime: string, endTime: string) => void;
}) {
  const today = isToday(day);
  const dayJobs = jobsOnDate(jobs, day);
  const total = bookedTotal(dayJobs);
  const signal = dayCueColor(dayJobs);
  const iso = toIsoDate(day);
  const label = format(day, "EEEE, MMMM d");
  const weekend = day.getDay() === 0 || day.getDay() === 6;

  return (
    <section
      className={`group flex min-h-0 flex-col overflow-hidden bg-white ${
        compact ? "" : "border-r border-gray-100 last:border-r-0"
      }`}
    >
      <div
        className={`flex shrink-0 items-start justify-between gap-1 border-b border-gray-100 ${
          compact ? "px-2.5 pb-1.5 pt-2" : "px-2.5 pb-2 pt-2.5"
        }`}
      >
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
          <span className="mt-1 flex items-center gap-2">
            <span
              className={`flex items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                compact ? "h-7 w-7" : "h-8 w-8"
              } ${today ? "bg-brand-blue text-white" : "text-brand-black"}`}
            >
              {format(day, "d")}
            </span>
            {total > 0 ? (
              <span
                className="text-[11px] font-semibold leading-4 tabular-nums"
                style={{ color: signal ?? undefined }}
              >
                {formatCurrency(total)}
              </span>
            ) : null}
          </span>
          {dayJobs.length > 0 ? (
            <span className="mt-0.5 block text-[11px] leading-4 text-gray-400">
              {dayJobs.length} {dayJobs.length === 1 ? "job" : "jobs"}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          aria-label={`Schedule a job on ${label}`}
          onClick={() => {
            const prefill = getNewJobTimePrefill(jobs, iso);
            onAddJob(iso, prefill.startTime, prefill.endTime);
          }}
          className={`flex shrink-0 items-center justify-center rounded-full transition hover:bg-brand-gray hover:text-brand-black focus:opacity-100 ${
            compact
              ? "h-8 w-8 text-gray-400 opacity-100"
              : "h-6 w-6 text-gray-300 opacity-0 group-hover:opacity-100"
          }`}
        >
          <Plus className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
        </button>
      </div>
      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${compact ? "gap-1.5 p-1.5" : "gap-2 p-2"}`}>
        {dayJobs.length === 0 ? (
          <p className="px-1 pt-6 text-center text-[12px] leading-4 text-gray-300">Nothing booked</p>
        ) : (
          dayJobs.map((job) => (
            <WeekJobCard key={job._id} job={job} jobs={jobs} dense={compact} onOpen={() => onOpenJob(job)} />
          ))
        )}
      </div>
    </section>
  );
}

function WeekJobCard({
  job,
  jobs,
  dense,
  onOpen,
}: {
  job: Job;
  jobs: Job[];
  dense?: boolean;
  onOpen: () => void;
}) {
  const name = getJobHouseholdTitle(job, jobs);
  const services = getJobServiceEntries(job);
  const address = getJobAddress(job);
  const duration = formatDurationShort(getJobDurationMinutes(job.startTime, job.endTime));
  const cancelled = job.status === "Cancelled";
  const accent = jobCueColor(job);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={jobSummary(job, name)}
      className={`w-full cursor-pointer border border-brand-border bg-white text-left transition active:bg-brand-gray ${
        dense ? "rounded-lg px-2 py-1.5" : "rounded-xl px-2.5 py-2.5"
      }`}
      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] font-semibold leading-4 tabular-nums text-gray-600">
          {formatTimeRange(job.startTime, job.endTime)}
          {dense ? <span className="ml-1 font-medium text-gray-400">{duration}</span> : null}
        </p>
        {dense ? (
          job.finalPrice !== undefined ? (
            <p className="shrink-0 text-[11px] font-bold leading-4 tabular-nums text-brand-black">
              {formatCurrency(job.finalPrice)}
            </p>
          ) : null
        ) : (
          <p className="shrink-0 text-[11px] leading-4 text-gray-400">{duration}</p>
        )}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        <p
          className={`min-w-0 font-semibold tracking-tight text-brand-black ${
            dense ? "truncate text-[13px] leading-5" : "wrap-break-word text-[13px] leading-5"
          } ${cancelled ? "line-through" : ""}`}
        >
          {name}
        </p>
        {!dense && job.finalPrice !== undefined ? (
          <p className="shrink-0 pt-px text-[12px] font-bold leading-5 tabular-nums text-brand-black">
            {formatCurrency(job.finalPrice)}
          </p>
        ) : null}
      </div>
      {services.length > 0 ? (
        <div className={`mt-1 flex flex-wrap gap-1 ${dense ? "max-h-8 overflow-hidden" : ""}`}>
          {services.map(({ label, serviceName }, index) => (
            <ServicePill
              key={`${job._id}-service-${index}`}
              serviceName={serviceName}
              label={label}
              size={dense ? "xs" : "sm"}
            />
          ))}
        </div>
      ) : null}
      {!dense && address ? (
        <div className="mt-1 flex min-w-0 items-start gap-0.5 text-[12px] leading-4 text-gray-500">
          <p className="min-w-0 wrap-break-word">{address}</p>
          <CopyAddressButton text={address} className="-mt-0.5 h-6 w-6" />
        </div>
      ) : null}
      <div className="mt-1.5">
        <StatusCue status={job.status} paid={job.paid} size="xs" />
      </div>
    </div>
  );
}
