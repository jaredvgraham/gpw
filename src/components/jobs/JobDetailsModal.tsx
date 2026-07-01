"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/types";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import JobCustomerHeader from "@/components/customers/JobCustomerHeader";
import { getJobDateOnly } from "@/lib/dates";
import {
  formatCurrency,
  formatDate,
  formatTime,
  getCustomerAddress,
  getJobDuration,
} from "@/lib/utils";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import type { Customer } from "@/types";
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
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (open && job) setPaid(job.paid ?? false);
  }, [open, job?._id, job?.paid]);

  if (!job) return null;

  const customer = typeof job.customer === "object" ? (job.customer as Customer) : null;

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
    <Modal open={open} onClose={onClose} title="Job Details" size="lg">
      <div className="space-y-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <JobCustomerHeader job={job} />
            {customer && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {getCustomerAddress(customer)}
              </p>
            )}
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {customer?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-gray-400" />
              <a href={`tel:${customer.phone}`} className="text-brand-blue hover:underline">
                {customer.phone}
              </a>
            </div>
          )}
          {customer?.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <a href={`mailto:${customer.email}`} className="text-brand-blue hover:underline">
                {customer.email}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            {formatDate(job.jobDate)} · {formatTime(job.startTime)} – {formatTime(job.endTime)}
            <span className="text-gray-400">({getJobDuration(job.startTime, job.endTime)})</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Services</h4>
          <div className="flex flex-wrap gap-2">
            {job.services.map((s, i) => (
              <span
                key={i}
                className="rounded-full bg-blue-50 text-brand-blue px-3 py-1 text-sm font-medium"
              >
                {s.name === "Other" && s.customServiceName ? s.customServiceName : s.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-stretch gap-4">
          <div className="rounded-lg bg-brand-gray p-3 flex-1">
            <p className="text-xs text-gray-500">Final Price</p>
            <p className="text-sm font-semibold mt-0.5">{formatCurrency(job.finalPrice)}</p>
          </div>
          <button
            type="button"
            onClick={togglePaid}
            disabled={loading}
            className={`flex flex-col items-start justify-center rounded-xl border-2 px-4 py-3 min-w-[8.5rem] transition-colors disabled:opacity-50 ${
              paid
                ? "border-green-500 bg-green-50"
                : "border-brand-border bg-white hover:bg-brand-gray"
            }`}
          >
            <span className="text-xs text-gray-500">Paid</span>
            <span
              className={`mt-1 flex items-center gap-2 text-sm font-semibold ${
                paid ? "text-green-700" : "text-gray-600"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded border-2 shrink-0 ${
                  paid ? "border-green-500 bg-green-500 text-white" : "border-gray-300 bg-white"
                }`}
              >
                {paid && "✓"}
              </span>
              {paid ? "Paid in full" : "Not paid"}
            </span>
          </button>
        </div>

        {[
          { label: "Internal Notes", value: job.internalNotes },
          { label: "Photo Notes", value: job.photoNotes },
        ]
          .filter((n) => n.value)
          .map(({ label, value }) => (
            <div key={label}>
              <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
              <p className="text-sm text-gray-600 mt-1">{value}</p>
            </div>
          ))}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-border">
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              openEditJob(job);
            }}
          >
            Edit
          </Button>
          <Button variant="danger" onClick={deleteJob} disabled={loading}>
            Delete
          </Button>
          {job.status !== "Completed" && (
            <Button variant="success" onClick={() => updateStatus("Completed")} disabled={loading}>
              Mark Completed
            </Button>
          )}
          {job.status !== "Cancelled" && (
            <Button variant="secondary" onClick={() => updateStatus("Cancelled")} disabled={loading}>
              Mark Cancelled
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
