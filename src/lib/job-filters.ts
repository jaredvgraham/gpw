import { getJobDateOnly } from "@/lib/dates";
import type { JobFilters } from "@/components/jobs/JobFiltersBar";
import type { Job } from "@/types";

export function filterJobs(jobs: Job[], filters: JobFilters): Job[] {
  return jobs.filter((job) => {
    if (filters.status && job.status !== filters.status) return false;

    const dateStr = getJobDateOnly(job.jobDate);
    if (filters.startDate && dateStr < filters.startDate) return false;
    if (filters.endDate && dateStr > filters.endDate) return false;

    if (filters.service) {
      const term = filters.service.toLowerCase();
      const hasService = job.services.some((service) =>
        service.name.toLowerCase().includes(term)
      );
      if (!hasService) return false;
    }

    if (filters.city) {
      const customer = typeof job.customer === "object" ? job.customer : null;
      if (!customer?.city?.toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      const customer = typeof job.customer === "object" ? job.customer : null;
      const matches =
        customer?.name?.toLowerCase().includes(term) ||
        customer?.phone?.toLowerCase().includes(term) ||
        customer?.streetAddress?.toLowerCase().includes(term);
      if (!matches) return false;
    }

    return true;
  });
}
