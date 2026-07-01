"use client";

import type { Job } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  formatCurrency,
  formatDate,
  formatTime,
  getCustomerName,
  getJobDuration,
} from "@/lib/utils";
import Link from "next/link";
import { MapPin, Clock, Phone } from "lucide-react";

export default function JobCard({ job }: { job: Job }) {
  const customer = typeof job.customer === "object" ? job.customer : null;

  return (
    <Link
      href={`/jobs/${job._id}`}
      className="block rounded-xl bg-white border border-brand-border p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-brand-black">{getCustomerName(job)}</h3>
          {customer && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {[customer.streetAddress, customer.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatDate(job.jobDate)} · {formatTime(job.startTime)} – {formatTime(job.endTime)}
        </span>
        {customer?.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            {customer.phone}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.services.map((s, i) => (
          <span
            key={i}
            className="rounded-full bg-blue-50 text-brand-blue px-2 py-0.5 text-xs font-medium"
          >
            {s.name === "Other" && s.customServiceName ? s.customServiceName : s.name}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">{getJobDuration(job.startTime, job.endTime)}</span>
        {job.finalPrice !== undefined && (
          <span className="font-semibold text-brand-black">
            {formatCurrency(job.finalPrice)}
            {job.paid && <span className="ml-1 text-green-600 text-xs">(Paid)</span>}
          </span>
        )}
      </div>
    </Link>
  );
}
