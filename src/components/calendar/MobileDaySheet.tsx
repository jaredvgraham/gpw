"use client";

import { format } from "date-fns";
import { getJobDateOnly } from "@/lib/dates";
import type { Job } from "@/types";
import { formatTime, getJobAddress } from "@/lib/utils";
import JobCustomerHeader from "@/components/customers/JobCustomerHeader";
import { STATUS_COLORS } from "@/lib/constants";
import { getNewJobTimePrefill } from "@/lib/calendar-mobile";
import { X, Plus, MapPin, Clock } from "lucide-react";

interface MobileDaySheetProps {
  open: boolean;
  date: Date | null;
  jobs: Job[];
  onClose: () => void;
  onJobClick: (job: Job) => void;
  onAddJob: (jobDate: string, startTime: string, endTime: string) => void;
}

export default function MobileDaySheet({
  open,
  date,
  jobs,
  onClose,
  onJobClick,
  onAddJob,
}: MobileDaySheetProps) {
  if (!open || !date) return null;

  const dateStr = format(date, "yyyy-MM-dd");
  const dayJobs = jobs
    .filter((job) => getJobDateOnly(job.jobDate) === dateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full md:max-w-md max-h-[85vh] md:max-h-[80vh] flex flex-col rounded-t-2xl md:rounded-2xl bg-white shadow-xl animate-slide-up md:animate-none safe-area-bottom">
        <div className="flex items-center justify-between px-4 py-4 border-b border-brand-border shrink-0">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {format(date, "EEE")}
            </p>
            <h3 className="text-lg font-bold text-brand-black">{format(date, "MMM d, yyyy")}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-brand-gray"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {dayJobs.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">No jobs scheduled this day.</p>
          ) : (
            dayJobs.map((job) => {
              const address = getJobAddress(job);
              return (
                <button
                  key={job._id}
                  type="button"
                  onClick={() => onJobClick(job)}
                  className="w-full text-left rounded-xl border border-brand-border p-4 active:bg-brand-gray transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <JobCustomerHeader job={job} compact showMembers={false} />
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: STATUS_COLORS[job.status] }}
                    >
                      {job.status}
                    </span>
                  </div>
                  {address && (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {address}
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(job.startTime)} – {formatTime(job.endTime)}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="shrink-0 p-4 border-t border-brand-border bg-white">
          <button
            type="button"
            onClick={() => {
              const { startTime, endTime } = getNewJobTimePrefill(jobs, dateStr);
              onAddJob(dateStr, startTime, endTime);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red py-4 text-base font-semibold text-white active:bg-red-700"
          >
            <Plus className="h-5 w-5" />
            Add Job on {format(date, "MMM d")}
          </button>
        </div>
      </div>
    </div>
  );
}
