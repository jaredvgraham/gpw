"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import JobCard from "@/components/jobs/JobCard";
import JobFiltersBar, { type JobFilters } from "@/components/jobs/JobFiltersBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Job } from "@/types";
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<JobFilters>(defaultFilters);
  const [serviceNames, setServiceNames] = useState<string[]>([]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.service) params.set("service", filters.service);
    if (filters.city) params.set("city", filters.city);

    try {
      const res = await fetch(`/api/jobs?${params.toString()}`);
      const data = await res.json();
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServiceNames(data.map((s: { name: string }) => s.name)));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchJobs, 300);
    return () => clearTimeout(timeout);
  }, [fetchJobs]);

  useEffect(() => {
    const handler = () => fetchJobs();
    window.addEventListener("gpw:job-saved", handler);
    return () => window.removeEventListener("gpw:job-saved", handler);
  }, [fetchJobs]);

  return (
    <div>
      <PageHeader
        title="All Jobs"
        description={`${jobs.length} job${jobs.length !== 1 ? "s" : ""} found`}
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

      {loading ? (
        <LoadingSpinner />
      ) : jobs.length === 0 ? (
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
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
