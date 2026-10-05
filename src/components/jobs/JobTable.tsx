import Link from "next/link";
import type { Job } from "@/types";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  formatCurrency,
  formatDate,
  formatTime,
  getCustomerName,
  getJobDuration,
} from "@/lib/utils";

function serviceLabel(job: Job) {
  return job.services
    .map((service) =>
      service.name === "Other" && service.customServiceName
        ? service.customServiceName
        : service.name
    )
    .join(", ");
}

function town(job: Job) {
  if (typeof job.customer !== "object" || !job.customer) return "";
  return [job.customer.city, job.customer.state].filter(Boolean).join(", ");
}

export default function JobTable({ jobs }: { jobs: Job[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 z-10 border-b border-brand-border bg-brand-gray text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2.5 font-semibold">When</th>
            <th className="px-4 py-2.5 font-semibold">Customer</th>
            <th className="px-4 py-2.5 font-semibold">Town</th>
            <th className="px-4 py-2.5 font-semibold">Services</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-4 py-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border">
          {jobs.map((job) => {
            const customer = typeof job.customer === "object" ? job.customer : null;
            return (
              <tr key={job._id} className="hover:bg-blue-50/40">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link href={`/jobs/${job._id}`} className="block">
                    <p className="font-medium text-brand-black">{formatDate(job.jobDate)}</p>
                    <p className="text-xs text-gray-500">
                      {formatTime(job.startTime)} – {formatTime(job.endTime)}
                      <span className="text-gray-400"> · {getJobDuration(job.startTime, job.endTime)}</span>
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/jobs/${job._id}`} className="block">
                    <p className="font-semibold text-brand-black">{getCustomerName(job)}</p>
                    {customer?.streetAddress && (
                      <p className="max-w-[16rem] truncate text-xs text-gray-500">{customer.streetAddress}</p>
                    )}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-600">{town(job)}</td>
                <td className="max-w-[18rem] px-4 py-3 text-gray-700">
                  <p className="truncate">{serviceLabel(job) || "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <p className="font-semibold tabular-nums text-brand-black">
                    {formatCurrency(job.finalPrice)}
                  </p>
                  <p className={`text-xs font-medium ${job.paid ? "text-green-600" : "text-gray-400"}`}>
                    {job.paid ? "Paid" : "Unpaid"}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
