"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import type { Customer, Job } from "@/types";
import Modal from "@/components/ui/Modal";
import JobCustomerHeader from "@/components/customers/JobCustomerHeader";
import { formatTimeRange, STATUS_SURFACE } from "@/components/calendar/desktop/model";
import { getJobDateOnly } from "@/lib/dates";
import { getJobHouseholdDisplay } from "@/lib/household-display";
import CopyAddressButton from "@/components/ui/CopyAddressButton";
import { formatCurrency, getCustomerAddress, getJobDuration } from "@/lib/utils";
import { useAppData } from "@/contexts/AppDataContext";
import { notifyJobSaved, useJobModals } from "@/contexts/JobModalContext";

interface JobDetailsModalProps {
  job: Job | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function JobDetailsModal({
  job,
  open,
  onClose,
  onUpdated,
}: JobDetailsModalProps) {
  const { openEditJob } = useJobModals();
  const { jobs } = useAppData();
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (open && job) setPaid(job.paid ?? false);
  }, [open, job?._id, job?.paid]);

  if (!job) return null;

  const customer = typeof job.customer === "object" ? (job.customer as Customer) : null;
  const display = getJobHouseholdDisplay(job, jobs);
  const surface = STATUS_SURFACE[job.status] ?? STATUS_SURFACE.Scheduled;
  const [year, month, day] = getJobDateOnly(job.jobDate).split("-").map(Number);
  const when = format(new Date(year, month - 1, day), "EEEE, MMMM d");
  const services = job.services
    .map((service) => (service.name === "Other" && service.customServiceName ? service.customServiceName : service.name))
    .filter(Boolean);
  const notes = [
    { label: "Internal notes", value: job.internalNotes },
    { label: "Photo notes", value: job.photoNotes },
  ].filter((note) => note.value);

  function buildPatchBody(overrides: { status?: string; paid?: boolean } = {}) {
    const customerId =
      typeof job!.customer === "object" ? job!.customer._id : job!.customer;
    return {
      customerId,
      jobDate: getJobDateOnly(job!.jobDate),
      startTime: job!.startTime,
      endTime: job!.endTime,
      status: overrides.status ?? job!.status,
      services: job!.services.map((s) => ({
        service: typeof s.service === "object" ? s.service?._id : s.service,
        name: s.name,
        customServiceName: s.customServiceName,
        notes: s.notes,
      })),
      finalPrice: job!.finalPrice,
      paid: overrides.paid ?? paid,
      internalNotes: job!.internalNotes,
      photoNotes: job!.photoNotes,
    };
  }

  async function patchJob(
    overrides: { status?: string; paid?: boolean },
    closeAfter = false
  ) {
    setLoading(true);
    try {
      await fetch(`/api/jobs/${job!._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPatchBody(overrides)),
      });
      if (overrides.paid !== undefined) setPaid(overrides.paid);
      notifyJobSaved();
      onUpdated?.();
      if (closeAfter) onClose();
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: string) {
    await patchJob({ status }, true);
  }

  async function togglePaid() {
    await patchJob({ paid: !paid });
  }

  async function deleteJob() {
    if (!confirm("Are you sure you want to delete this job?")) return;
    setLoading(true);
    try {
      await fetch(`/api/jobs/${job!._id}`, { method: "DELETE" });
      notifyJobSaved();
      onUpdated?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={display.primaryName} size="lg" bare>
      <div className="h-1" style={{ backgroundColor: surface.accent }} />
      <div className="px-7 pb-6 pt-8">
        <div className="pr-10">
          <h2 className="text-[2rem] font-semibold leading-none tracking-tight text-gray-950">
            {display.primaryName}
          </h2>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: surface.accent }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: surface.accent }} />
            {job.status}
          </p>
          {display.memberCount > 1 ? (
            <div className="mt-3">
              <JobCustomerHeader job={job} showName={false} />
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-[17px] font-medium tracking-tight text-gray-950">
          {when}
          <span className="px-2 text-gray-300">·</span>
          {formatTimeRange(job.startTime, job.endTime)}
          <span className="px-2 text-gray-300">·</span>
          {getJobDuration(job.startTime, job.endTime)}
        </p>

        {customer ? (
          <p className="mt-2 flex items-start gap-1 text-[15px] leading-relaxed text-gray-500">
            <span className="min-w-0">{getCustomerAddress(customer)}</span>
            <CopyAddressButton text={getCustomerAddress(customer)} className="-mt-1" />
          </p>
        ) : null}
        {(customer?.phone || customer?.email) && (
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
            {customer?.phone ? (
              <a href={`tel:${customer.phone}`} className="text-gray-700 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-700">
                {customer.phone}
              </a>
            ) : null}
            {customer?.email ? (
              <a href={`mailto:${customer.email}`} className="text-gray-700 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-700">
                {customer.email}
              </a>
            ) : null}
          </p>
        )}

        {services.length > 0 ? (
          <p className="mt-6 text-[15px] leading-relaxed text-gray-600">{services.join(" · ")}</p>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-6 border-t border-gray-100 pt-6">
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-gray-950">
            {formatCurrency(job.finalPrice)}
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={paid}
            onClick={togglePaid}
            disabled={loading}
            className="inline-flex items-center gap-3 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            {paid ? "Paid" : "Unpaid"}
            <span className={`relative h-7 w-12 rounded-full transition ${paid ? "bg-green-500" : "bg-gray-200"}`}>
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition ${
                  paid ? "left-5" : "left-0.5"
                }`}
              />
            </span>
          </button>
        </div>

        {notes.length > 0 ? (
          <div className="mt-6 space-y-4 border-t border-gray-100 pt-6">
            {notes.map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm font-medium text-gray-950">{label}</p>
                <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-600">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-gray-100 pt-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              openEditJob(job);
            }}
            className="text-sm font-medium text-gray-500 transition hover:text-gray-950"
          >
            Edit
          </button>
          {job.status !== "Cancelled" ? (
            <button
              type="button"
              onClick={() => updateStatus("Cancelled")}
              disabled={loading}
              className="text-sm font-medium text-gray-500 transition hover:text-gray-950 disabled:opacity-50"
            >
              Cancel job
            </button>
          ) : null}
          <button
            type="button"
            onClick={deleteJob}
            disabled={loading}
            className="text-sm font-medium text-red-600 transition hover:text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
          {job.status !== "Completed" ? (
            <button
              type="button"
              onClick={() => updateStatus("Completed")}
              disabled={loading}
              className="ml-auto rounded-full bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              Complete
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
