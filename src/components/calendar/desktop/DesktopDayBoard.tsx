"use client";

import { Plus } from "lucide-react";
import CopyAddressButton from "@/components/ui/CopyAddressButton";
import type { Job } from "@/types";
import { getNewJobTimePrefill } from "@/lib/calendar-mobile";
import { formatCurrency, formatTime, getJobAddress } from "@/lib/utils";
import { getJobHouseholdTitle } from "@/lib/household-display";
import {
  formatTimeRange,
  jobServiceLabel,
  jobStatusMark,
  jobSummary,
  jobsOnDate,
  STATUS_SURFACE,
  toIsoDate,
} from "@/components/calendar/desktop/model";

const MARK_CLASS = {
  good: "text-green-700",
  alert: "text-amber-700",
  muted: "text-gray-400",
  bad: "text-red-600",
} as const;

export default function DesktopDayBoard({
  cursor,
  jobs,
  onOpenJob,
  onAddJob,
}: {
  cursor: Date;
  jobs: Job[];
  onOpenJob: (job: Job) => void;
  onAddJob: (jobDate: string, startTime: string, endTime: string) => void;
}) {
  const dayJobs = jobsOnDate(jobs, cursor);
  const iso = toIsoDate(cursor);

  function schedule() {
    const prefill = getNewJobTimePrefill(jobs, iso);
    onAddJob(iso, prefill.startTime, prefill.endTime);
  }

  return (
    <div className="h-full min-h-0 overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-6">
        {dayJobs.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-16 text-center ring-1 ring-gray-200">
            <p className="text-lg font-semibold tracking-tight text-brand-black">Nothing on the books</p>
            <button
              type="button"
              onClick={schedule}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              Schedule a job
            </button>
          </div>
        ) : (
          dayJobs.map((job) => (
            <DayJobCard key={job._id} job={job} jobs={jobs} onOpen={() => onOpenJob(job)} />
          ))
        )}
        {dayJobs.length > 0 ? (
          <button
            type="button"
            onClick={schedule}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-full px-3 py-2 text-sm font-semibold text-gray-500 transition hover:bg-white hover:text-brand-black"
          >
            <Plus className="h-4 w-4" />
            Schedule a job
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DayJobCard({ job, jobs, onOpen }: { job: Job; jobs: Job[]; onOpen: () => void }) {
  const name = getJobHouseholdTitle(job, jobs);
  const address = getJobAddress(job);
  const services = jobServiceLabel(job);
  const mark = jobStatusMark(job);
  const surface = STATUS_SURFACE[job.status] ?? STATUS_SURFACE.Scheduled;
  const cancelled = job.status === "Cancelled";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={jobSummary(job, name)}
      className="grid w-full grid-cols-[7.25rem_minmax(0,1fr)_auto] items-start gap-4 rounded-2xl border border-black/[0.04] px-5 py-4 text-left transition hover:brightness-[0.98]"
      style={{ backgroundColor: surface.bg, boxShadow: `inset 3px 0 0 ${surface.accent}` }}
    >
      <span>
        <span className="block text-sm font-semibold tabular-nums" style={{ color: surface.accent }}>
          {formatTime(job.startTime)}
        </span>
        <span className="mt-0.5 block text-xs font-medium tabular-nums text-gray-400">
          {formatTime(job.endTime)}
        </span>
        <span className="sr-only">{formatTimeRange(job.startTime, job.endTime)}</span>
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate text-base font-semibold tracking-tight text-gray-900 ${cancelled ? "line-through" : ""}`}
        >
          {name}
        </span>
        {services ? (
          <span className="mt-1 block text-sm font-medium leading-snug text-gray-700">{services}</span>
        ) : null}
        {address ? (
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-sm leading-snug text-gray-500">
            <span className="truncate">{address}</span>
            <CopyAddressButton text={address} />
          </span>
        ) : null}
      </span>
      <span className="text-right">
        {job.finalPrice !== undefined ? (
          <span className="block text-base font-semibold tabular-nums text-gray-900">
            {formatCurrency(job.finalPrice)}
          </span>
        ) : null}
        {mark ? (
          <span className={`mt-1 block text-xs font-medium ${MARK_CLASS[mark.tone]}`}>{mark.label}</span>
        ) : (
          <span className="mt-1 block text-xs font-medium text-gray-400">Scheduled</span>
        )}
      </span>
    </button>
  );
}
