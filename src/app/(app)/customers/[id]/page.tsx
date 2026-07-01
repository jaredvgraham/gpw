"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import JobCard from "@/components/jobs/JobCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import HouseholdPanel from "@/components/customers/HouseholdPanel";
import type { Customer, Household, Job } from "@/types";
import { getCustomerAddress } from "@/lib/utils";
import { MapPin, Phone, Mail } from "lucide-react";
import { useJobModals } from "@/contexts/JobModalContext";

export default function CustomerDetailPage() {
  const { openNewJob } = useJobModals();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<Customer[]>([]);
  const [householdSuggestions, setHouseholdSuggestions] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [householdJobs, setHouseholdJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomer = useCallback(async () => {
    const res = await fetch(`/api/customers/${id}`);
    const data = await res.json();
    setCustomer(data.customer);
    setHousehold(data.household ?? null);
    setHouseholdMembers(data.householdMembers ?? []);
    setHouseholdSuggestions(data.householdSuggestions ?? []);
    setJobs(data.jobs ?? []);
    setHouseholdJobs(data.householdJobs ?? []);
  }, [id]);

  useEffect(() => {
    loadCustomer().finally(() => setLoading(false));
  }, [loadCustomer]);

  useEffect(() => {
    const handler = () => {
      loadCustomer();
    };
    window.addEventListener("gpw:job-saved", handler);
    return () => window.removeEventListener("gpw:job-saved", handler);
  }, [loadCustomer]);

  if (loading) return <LoadingSpinner />;
  if (!customer) return <p className="text-gray-500">Customer not found.</p>;

  const upcoming = jobs.filter(
    (job) => job.status !== "Completed" && job.status !== "Cancelled"
  );
  const past = jobs.filter(
    (job) => job.status === "Completed" || job.status === "Cancelled"
  );
  const householdUpcoming = householdJobs.filter(
    (job) => job.status !== "Completed" && job.status !== "Cancelled"
  );
  const householdPast = householdJobs.filter(
    (job) => job.status === "Completed" || job.status === "Cancelled"
  );

  return (
    <div>
      <PageHeader
        title={customer.name}
        action={
          <button
            type="button"
            onClick={() => openNewJob({ customerId: customer._id })}
            className="inline-flex items-center rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            + Schedule Job
          </button>
        }
      />

      <div className="rounded-xl bg-white border border-brand-border p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="h-4 w-4 text-gray-400" />
            <a href={`tel:${customer.phone}`} className="text-brand-blue hover:underline">
              {customer.phone}
            </a>
          </div>
          {customer.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              <a href={`mailto:${customer.email}`} className="text-brand-blue hover:underline">
                {customer.email}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            {getCustomerAddress(customer)}
          </div>
        </div>
      </div>

      <HouseholdPanel
        customerId={customer._id}
        household={household}
        members={householdMembers}
        suggestions={householdSuggestions}
        onUpdated={loadCustomer}
      />

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-brand-black mb-4">
            {customer.name}&apos;s jobs
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Upcoming ({upcoming.length})
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-500">No upcoming jobs.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcoming.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Past ({past.length})
              </h3>
              {past.length === 0 ? (
                <p className="text-sm text-gray-500">No past jobs.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {past.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {(householdUpcoming.length > 0 || householdPast.length > 0) && (
          <section>
            <h2 className="text-lg font-semibold text-brand-black mb-1">
              Other household jobs
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Jobs booked by other people at {household?.streetAddress ?? "this address"}.
            </p>

            <div className="space-y-6">
              {householdUpcoming.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Upcoming ({householdUpcoming.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {householdUpcoming.map((job) => (
                      <JobCard key={job._id} job={job} />
                    ))}
                  </div>
                </div>
              )}

              {householdPast.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Past ({householdPast.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {householdPast.map((job) => (
                      <JobCard key={job._id} job={job} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
