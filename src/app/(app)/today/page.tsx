"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import TodaySummaryStrip from "@/components/today/TodaySummaryStrip";
import TodayJobCard from "@/components/today/TodayJobCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getJobsForDate } from "@/lib/calendar-mobile";
import { useAppData } from "@/contexts/AppDataContext";
import { formatCurrency } from "@/lib/utils";
import type { Job } from "@/types";

export default function TodayPage() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const { jobs, jobsLoading } = useAppData();

  const todayJobs = useMemo(() => getJobsForDate(jobs, todayStr), [jobs, todayStr]);
  const activeJobs = todayJobs.filter((job) => job.status !== "Cancelled");
  const cancelledJobs = todayJobs.filter((job) => job.status === "Cancelled");
  const loading = jobsLoading && jobs.length === 0;

  return (
    <>
      <div className="mx-auto w-full max-w-2xl md:hidden">
        <div className="pt-3">
          <div className="mb-4">
            <TodaySummaryStrip jobs={activeJobs} loading={loading} />
          </div>
          <RouteList
            activeJobs={activeJobs}
            cancelledJobs={cancelledJobs}
            dateStr={todayStr}
            loading={loading}
          />
        </div>
      </div>

      <div className="hidden min-h-0 flex-1 flex-col md:flex">
        <div className="mb-4 flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-brand-black">Today</h1>
            <p className="mt-1 text-sm text-gray-500">{format(new Date(), "EEEE, MMMM d")}</p>
          </div>
          <div className="flex gap-8">
            <Stat label="Stops" value={loading ? "—" : String(activeJobs.length)} />
            <Stat
              label="On the route"
              value={loading ? "—" : formatCurrency(activeJobs.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0))}
            />
            <Stat
              label="Collected"
              value={
                loading
                  ? "—"
                  : formatCurrency(
                      activeJobs
                        .filter((job) => job.paid)
                        .reduce((sum, job) => sum + (job.finalPrice ?? 0), 0)
                    )
              }
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-brand-border bg-white">
          {loading ? (
            <LoadingSpinner />
          ) : activeJobs.length === 0 && cancelledJobs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-gray-600">No jobs on today&apos;s route.</p>
              <p className="mt-1 text-xs text-gray-400">Check the calendar for upcoming work.</p>
            </div>
          ) : (
            <>
              {activeJobs.map((job, index) => (
                <TodayJobCard
                  key={job._id}
                  job={job}
                  index={index + 1}
                  dateStr={todayStr}
                  variant="board"
                />
              ))}
              {cancelledJobs.length > 0 && (
                <div className="border-t border-brand-border bg-brand-gray/50 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Cancelled
                </div>
              )}
              {cancelledJobs.map((job, index) => (
                <TodayJobCard
                  key={job._id}
                  job={job}
                  index={index + 1}
                  dateStr={todayStr}
                  variant="board"
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-brand-black">{value}</p>
    </div>
  );
}

function RouteList({
  activeJobs,
  cancelledJobs,
  dateStr,
  loading,
}: {
  activeJobs: Job[];
  cancelledJobs: Job[];
  dateStr: string;
  loading: boolean;
}) {
  if (loading) return <LoadingSpinner />;
  if (activeJobs.length === 0 && cancelledJobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
        <p className="text-sm font-semibold text-gray-600">No jobs on today&apos;s route.</p>
        <p className="mt-1 text-xs text-gray-400">Check the calendar for upcoming work.</p>
      </div>
    );
  }

  return (
    <div>
      {activeJobs.map((job, index) => (
        <TodayJobCard
          key={job._id}
          job={job}
          index={index + 1}
          isLast={index === activeJobs.length - 1 && cancelledJobs.length === 0}
          dateStr={dateStr}
        />
      ))}
      {cancelledJobs.length > 0 && (
        <section className="mt-2 border-t border-gray-200 pt-4">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Cancelled
          </p>
          {cancelledJobs.map((job, index) => (
            <TodayJobCard
              key={job._id}
              job={job}
              index={index + 1}
              isLast={index === cancelledJobs.length - 1}
              dateStr={dateStr}
            />
          ))}
        </section>
      )}
    </div>
  );
}
