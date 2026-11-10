"use client";

import { Plus } from "lucide-react";
import CopyAddressButton from "@/components/ui/CopyAddressButton";
import type { Job } from "@/types";
import { getJobServiceEntries, getNewJobTimePrefill } from "@/lib/calendar-mobile";
import { formatCurrency, formatTime, getJobAddress } from "@/lib/utils";
import { getJobHouseholdTitle } from "@/lib/household-display";
import { jobCueColor } from "@/lib/constants";
import ServicePill from "@/components/calendar/ServicePill";
import StatusCue from "@/components/calendar/StatusCue";
import {
  bookedTotal,
  formatTimeRange,
  jobSummary,
  jobsOnDate,
  toIsoDate,
} from "@/components/calendar/desktop/model";

export default function DesktopDayBoard({
  cursor,
  jobs,
  onOpenJob,
  onAddJob,
  duo = false,
}: {
  cursor: Date;
  jobs: Job[];
  onOpenJob: (job: Job) => void;
  onAddJob: (jobDate: string, startTime: string, endTime: string) => void;
  duo?: boolean;
}) {
  const dayJobs = jobsOnDate(jobs, cursor);
  const iso = toIsoDate(cursor);
  const total = bookedTotal(dayJobs);

  function schedule() {
    const prefill = getNewJobTimePrefill(jobs, iso);
    onAddJob(iso, prefill.startTime, prefill.endTime);
  }

  const list = (
    <>
      {dayJobs.length === 0 ? (
        <div className={`bg-white text-center ${duo ? "rounded-xl px-6 py-10" : "rounded-2xl px-8 py-16 ring-1 ring-gray-200"}`}>
          <p className="text-lg font-semibold tracking-tight text-brand-black">Nothing on the books</p>
          {duo ? null : (
            <button
              type="button"
              onClick={schedule}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Schedule a job
            </button>
          )}
        </div>
      ) : (
        dayJobs.map((job) => (
          <DayJobCard key={job._id} job={job} jobs={jobs} onOpen={() => onOpenJob(job)} compact={duo} />
        ))
      )}
      {dayJobs.length > 0 && !duo ? (
        <button
          type="button"
          onClick={schedule}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-full px-3 py-2 text-sm font-semibold text-gray-500 transition hover:bg-white hover:text-brand-black"
        >
          <Plus className="h-4 w-4" />
          Schedule a job
        </button>
      ) : null}
    </>
  );

  if (duo) {
    return (
      <div className="duo-panes h-full min-h-0 overflow-hidden bg-brand-gray">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto p-4">{list}</div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-4 p-8">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-brand-black">
              {dayJobs.length} {dayJobs.length === 1 ? "job" : "jobs"}
            </p>
            <p className="mt-1 text-base text-gray-500">
              {total > 0 ? `${formatCurrency(total)} booked` : "Nothing booked"}
            </p>
          </div>
          <button
            type="button"
            onClick={schedule}
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white active:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            Schedule a job
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-6">{list}</div>
    </div>
  );
}

function DayJobCard({
  job,
  jobs,
  onOpen,
  compact = false,
}: {
  job: Job;
  jobs: Job[];
  onOpen: () => void;
  compact?: boolean;
}) {
  const name = getJobHouseholdTitle(job, jobs);
  const address = getJobAddress(job);
  const services = getJobServiceEntries(job);
  const cancelled = job.status === "Cancelled";
  const accent = jobCueColor(job);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={jobSummary(job, name)}
      className={`grid w-full grid-cols-[7.25rem_minmax(0,1fr)_auto] items-start bg-white text-left transition active:bg-brand-gray ${
        compact
          ? "gap-3 rounded-xl border border-brand-border px-4 py-3"
          : "gap-4 rounded-xl border border-brand-border px-5 py-4"
      }`}
      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      <span>
        <span className="block text-sm font-semibold tabular-nums text-gray-600">
          {formatTime(job.startTime)}
        </span>
        <span className="mt-0.5 block text-xs font-medium tabular-nums text-gray-400">
          {formatTime(job.endTime)}
        </span>
        <span className="sr-only">{formatTimeRange(job.startTime, job.endTime)}</span>
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate text-base font-semibold tracking-tight text-brand-black ${cancelled ? "line-through" : ""}`}
        >
          {name}
        </span>
        {services.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap gap-1">
            {services.map(({ label, serviceName }, index) => (
              <ServicePill
                key={`${job._id}-service-${index}`}
                serviceName={serviceName}
                label={label}
              />
            ))}
          </span>
        ) : (
          <span className="mt-1 block text-sm text-gray-400">No services</span>
        )}
        {address ? (
          <span className="mt-1 flex min-w-0 items-center gap-1 text-sm leading-snug text-gray-500">
            <span className="truncate">{address}</span>
            <CopyAddressButton text={address} />
          </span>
        ) : null}
      </span>
      <span className="flex flex-col items-end gap-1.5 text-right">
        <StatusCue status={job.status} paid={job.paid} />
        {job.finalPrice !== undefined ? (
          <span className="text-base font-bold tabular-nums text-brand-black">
            {formatCurrency(job.finalPrice)}
          </span>
        ) : null}
      </span>
    </button>
  );
}
