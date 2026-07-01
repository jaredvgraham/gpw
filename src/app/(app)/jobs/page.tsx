"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import JobCard from "@/components/jobs/JobCard";
import JobFiltersBar, { type JobFilters } from "@/components/jobs/JobFiltersBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAppData } from "@/contexts/AppDataContext";
import { filterJobs } from "@/lib/job-filters";
import { useJobModals } from "@/contexts/JobModalContext";

const defaultFilters: JobFilters = {
  search: "",
  status: "",
  startDate: "",
  endDate: "",
  service: "",
  city: "",
};

export default function JobsPage() {
  const { openNewJob } = useJobModals();
  const { jobs, services, jobsLoading } = useAppData();
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);

  const filteredJobs = useMemo(() => filterJobs(jobs, filters), [jobs, filters]);
  const serviceNames = useMemo(() => services.map((service) => service.name), [services]);

  return (
    <div>
      <PageHeader
        title="All Jobs"
        description={`${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""} found`}
        action={
          <button
            type="button"
            onClick={() => openNewJob()}
            className="inline-flex items-center rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            + Add Job
          </button>
        }
      />

      <div className="mb-6">
        <JobFiltersBar filters={filters} onChange={setFilters} services={serviceNames} />
      </div>

      {jobsLoading && jobs.length === 0 ? (
        <LoadingSpinner />
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-xl bg-white border border-brand-border p-12 text-center">
          <p className="text-gray-500">No jobs found. Create your first job to get started.</p>
          <button
            type="button"
            onClick={() => openNewJob()}
            className="inline-flex mt-4 items-center rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + Add Job
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredJobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
