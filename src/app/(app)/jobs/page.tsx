"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import JobCard from "@/components/jobs/JobCard";
import JobTable from "@/components/jobs/JobTable";
import JobFiltersBar, { JOB_QUICK_FILTERS, type JobFilters } from "@/components/jobs/JobFiltersBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAppData } from "@/contexts/AppDataContext";
import { filterJobs } from "@/lib/job-filters";

const defaultFilters: JobFilters = {
  search: "",
  status: "",
  paid: "",
  startDate: "",
  endDate: "",
  service: "",
  city: "",
};

export default function JobsPage() {
  const { jobs, services, jobsLoading } = useAppData();
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);

  const filteredJobs = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const serviceNames = useMemo(() => services.map((service) => service.name), [services]);
  const quickCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const preset of JOB_QUICK_FILTERS) {
      counts[preset.id] = filterJobs(jobs, {
        ...filters,
        status: preset.status,
        paid: preset.paid,
      }).length;
    }
    return counts;
  }, [jobs, filters]);

  return (
    <div>
      <PageHeader
        title="All Jobs"
        description={`${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""}`}
      />

      <div className="mb-6">
        <JobFiltersBar
          filters={filters}
          onChange={setFilters}
          services={serviceNames}
          counts={quickCounts}
        />
      </div>

      {jobsLoading && jobs.length === 0 ? (
        <LoadingSpinner />
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-xl bg-white border border-brand-border p-12 text-center">
          <p className="text-gray-500">No jobs match these filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredJobs.map((job) => (
              <JobCard key={job._id} job={job} />
            ))}
          </div>
          <div className="hidden md:block">
            <JobTable jobs={filteredJobs} />
          </div>
        </>
      )}
    </div>
  );
}
