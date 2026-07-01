"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import JobCard from "@/components/jobs/JobCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Customer, Job } from "@/types";
import { getCustomerAddress } from "@/lib/utils";
import { MapPin, Phone, Mail } from "lucide-react";
import { useJobModals } from "@/contexts/JobModalContext";

export default function CustomerDetailPage() {
  const { openNewJob } = useJobModals();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setCustomer(data.customer);
        setJobs(data.jobs);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handler = () => {
      fetch(`/api/customers/${id}`)
        .then((r) => r.json())
        .then((data) => {
          setCustomer(data.customer);
          setJobs(data.jobs);
        });
    };
    window.addEventListener("gpw:job-saved", handler);
    return () => window.removeEventListener("gpw:job-saved", handler);
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!customer) return <p className="text-gray-500">Customer not found.</p>;

  const upcoming = jobs.filter(
    (j) => j.status !== "Completed" && j.status !== "Cancelled"
  );
  const past = jobs.filter(
    (j) => j.status === "Completed" || j.status === "Cancelled"
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

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-brand-black mb-4">
            Upcoming Jobs ({upcoming.length})
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming jobs.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcoming.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-black mb-4">
            Past Jobs ({past.length})
          </h2>
          {past.length === 0 ? (
            <p className="text-sm text-gray-500">No past jobs.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {past.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
