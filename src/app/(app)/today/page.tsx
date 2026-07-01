"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import type { Job } from "@/types";
import TodaySummaryStrip from "@/components/today/TodaySummaryStrip";
import TodayJobCard from "@/components/today/TodayJobCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { getJobsForDate } from "@/lib/calendar-mobile";

export default function TodayPage() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(() => {
    setLoading(true);
    fetch(`/api/jobs?startDate=${todayStr}&endDate=${todayStr}`)
      .then((r) => r.json())
      .then((data) => setJobs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [todayStr]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    function handleJobSaved() {
      loadJobs();
    }

    window.addEventListener("gpw:job-saved", handleJobSaved);
    return () => window.removeEventListener("gpw:job-saved", handleJobSaved);
  }, [loadJobs]);

  const todayJobs = getJobsForDate(jobs, todayStr);
  const activeJobs = todayJobs.filter((job) => job.status !== "Cancelled");
  const cancelledJobs = todayJobs.filter((job) => job.status === "Cancelled");

  return (
    <div className="mx-auto w-full max-w-2xl md:max-w-3xl">
      <div className="mb-5 hidden md:block">
        <h1 className="text-2xl font-bold text-brand-black">Today&apos;s Itinerary</h1>
        <p className="mt-1 text-sm text-gray-500">{format(new Date(), "EEEE, MMMM d")}</p>
      </div>

      <div className="pt-3 md:pt-0">
        <div className="mb-4">
          <TodaySummaryStrip jobs={activeJobs} loading={loading} />
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : activeJobs.length === 0 && cancelledJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
            <p className="text-sm font-semibold text-gray-600">No jobs on today&apos;s route.</p>
            <p className="mt-1 text-xs text-gray-400">Check the calendar for upcoming work.</p>
          </div>
        ) : (
          <div>
            {activeJobs.map((job, index) => (
              <TodayJobCard
                key={job._id}
                job={job}
                index={index + 1}
                isLast={index === activeJobs.length - 1 && cancelledJobs.length === 0}
                dateStr={todayStr}
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
                    dateStr={todayStr}
                  />
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
