"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Phone,
  Navigation,
  Mail,
  MapPin,
  MessageSquare,
  Check,
  Wrench,
  DollarSign,
} from "lucide-react";
import type { Customer, Job } from "@/types";
import ServicePill from "@/components/calendar/ServicePill";
import JobCustomerHeader from "@/components/customers/JobCustomerHeader";
import { getJobServiceEntries } from "@/lib/calendar-mobile";
import { getJobDateOnly } from "@/lib/dates";
import { getItineraryStatus } from "@/lib/today-itinerary";
import {
  formatCurrency,
  formatTime,
  getCustomerAddress,
  getJobAddress,
} from "@/lib/utils";

function getCustomer(job: Job): Customer | null {
  return typeof job.customer === "object" ? job.customer : null;
}

function mapsUrl(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

function smsUrl(phone: string) {
  return `sms:${phone.replace(/\D/g, "")}`;
}

function buildPatchBody(job: Job, overrides: { status?: Job["status"]; paid?: boolean }) {
  const customerId =
    typeof job.customer === "object" ? job.customer._id : job.customer;

  return {
    customerId,
    jobDate: getJobDateOnly(job.jobDate),
    startTime: job.startTime,
    endTime: job.endTime,
    status: overrides.status ?? job.status,
    services: job.services.map((s) => ({
      service: typeof s.service === "object" ? s.service?._id : s.service,
      name: s.name,
      customServiceName: s.customServiceName,
      notes: s.notes,
    })),
    finalPrice: job.finalPrice,
    paid: overrides.paid ?? job.paid ?? false,
    internalNotes: job.internalNotes,
    photoNotes: job.photoNotes,
  };
}

async function patchJob(job: Job, overrides: { status?: Job["status"]; paid?: boolean }) {
  const res = await fetch(`/api/jobs/${job._id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildPatchBody(job, overrides)),
  });

  if (res.ok) {
    window.dispatchEvent(new Event("gpw:job-saved"));
    return true;
  }
  return false;
}

interface TodayJobCardProps {
  job: Job;
  index: number;
  isLast?: boolean;
  dateStr: string;
}

export default function TodayJobCard({
  job,
  index,
  isLast = false,
  dateStr,
}: TodayJobCardProps) {
  const [completing, setCompleting] = useState(false);
  const [updatingPaid, setUpdatingPaid] = useState(false);
  const [paid, setPaid] = useState(job.paid ?? false);

  const customer = getCustomer(job);
  const address =
    (customer && getCustomerAddress(customer)) || getJobAddress(job) || "";
  const hasAddress = Boolean(address && address !== "No address on file");
  const serviceEntries = getJobServiceEntries(job);
  const status = getItineraryStatus(job, dateStr);
  const noteText = job.internalNotes || job.photoNotes || "";

  useEffect(() => {
    setPaid(job.paid ?? false);
  }, [job._id, job.paid]);

  async function handleMarkComplete() {
    setCompleting(true);
    try {
      await patchJob(job, { status: "Completed" });
    } finally {
      setCompleting(false);
    }
  }

  async function handleTogglePaid() {
    const next = !paid;
    setUpdatingPaid(true);
    setPaid(next);
    try {
      const ok = await patchJob(job, { paid: next });
      if (!ok) setPaid(!next);
    } finally {
      setUpdatingPaid(false);
    }
  }

  return (
    <div className="relative flex gap-2">
      <div className="relative flex w-7 shrink-0 justify-center">
        {!isLast && <div className="absolute bottom-[-14px] top-2 w-px bg-gray-300" />}
        <div
          className="relative z-10 mt-2 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: status.highlight ? "#dc2626" : "#2563eb" }}
        >
          {index}
        </div>
      </div>

      <article
        className={`mb-3 min-w-0 flex-1 overflow-hidden rounded-2xl bg-white p-3.5 ${
          status.highlight
            ? "border-[1.5px] border-brand-red shadow-[0_1px_6px_rgba(220,38,38,0.12)]"
            : "border border-gray-200 shadow-sm"
        }`}
      >
        {/* Header */}
        <p className="text-xs font-bold text-gray-900 whitespace-nowrap">
          {formatTime(job.startTime)} – {formatTime(job.endTime)}
        </p>

        <div className="mt-1.5 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <JobCustomerHeader job={job} compact showMembers={false} />
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[8.5px] font-bold tracking-wider text-white"
            style={{ backgroundColor: status.color }}
          >
            {status.label}
          </span>
        </div>

        {/* Services */}
        {serviceEntries.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <Wrench className="h-3 w-3" />
              Services
            </p>
            <div className="flex flex-wrap gap-1">
              {serviceEntries.map(({ label, serviceName }, serviceIndex) => (
                <ServicePill
                  key={`${job._id}-service-${serviceIndex}`}
                  serviceName={serviceName}
                  label={label}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Customer — single section */}
        {(hasAddress || customer?.phone || customer?.email || noteText) && (
          <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2.5 space-y-2">
            {hasAddress && (
              <p className="flex items-start gap-2 text-xs leading-snug text-gray-700">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                {address}
              </p>
            )}
            {customer?.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-2 text-xs font-medium text-brand-blue"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                {customer.phone}
              </a>
            )}
            {customer?.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-2 text-xs text-gray-700"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                {customer.email}
              </a>
            )}
            {noteText && (
              <p className="flex items-start gap-2 text-xs leading-relaxed text-gray-600 border-t border-gray-200 pt-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                {noteText}
              </p>
            )}
          </div>
        )}

        {/* Total & paid */}
        <div
          className={`mt-3 flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
            paid
              ? "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
              : "border-emerald-100 bg-gradient-to-r from-white to-emerald-50/40"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                paid ? "bg-green-100" : "bg-emerald-100"
              }`}
            >
              <DollarSign
                className={`h-5 w-5 ${paid ? "text-green-600" : "text-emerald-600"}`}
                strokeWidth={2.5}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {paid ? "Collected" : "Job total"}
              </p>
              <p
                className={`mt-0.5 text-xl font-bold tabular-nums leading-none ${
                  paid ? "text-green-700" : "text-emerald-600"
                }`}
              >
                {formatCurrency(job.finalPrice)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePaid}
            disabled={updatingPaid}
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 transition-colors disabled:opacity-50 ${
              paid
                ? "border-green-400 bg-white"
                : "border-gray-300 bg-white active:bg-gray-100"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
                paid
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-gray-300 bg-white"
              }`}
            >
              {paid && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span
              className={`text-xs font-semibold ${paid ? "text-green-700" : "text-gray-600"}`}
            >
              {paid ? "Paid" : "Mark paid"}
            </span>
          </button>
        </div>

        {/* Actions */}
        <div className="mt-3 space-y-2">
          {(customer?.phone || hasAddress) && (
            <div className="flex gap-2">
              {customer?.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-semibold text-gray-800"
                >
                  <Phone className="h-3.5 w-3.5 text-brand-red" />
                  Call
                </a>
              )}
              {customer?.phone && (
                <a
                  href={smsUrl(customer.phone)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-semibold text-gray-800"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-brand-blue" />
                  Text
                </a>
              )}
              {hasAddress && (
                <a
                  href={mapsUrl(address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-2.5 text-xs font-semibold text-gray-800"
                >
                  <Navigation className="h-3.5 w-3.5 text-brand-blue" />
                  Navigate
                </a>
              )}
            </div>
          )}
          {job.status !== "Completed" && job.status !== "Cancelled" && (
            <button
              type="button"
              onClick={handleMarkComplete}
              disabled={completing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3.5 text-sm font-bold text-white shadow-sm active:bg-red-700 disabled:opacity-60"
            >
              <Check className="h-4 w-4" strokeWidth={3} />
              {completing ? "Saving…" : "Mark Complete"}
            </button>
          )}
        </div>
      </article>
    </div>
  );
}
