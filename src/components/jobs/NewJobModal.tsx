"use client";

import { useEffect, useState } from "react";
import type { Customer, Job } from "@/types";
import Modal from "@/components/ui/Modal";
import JobForm from "@/components/jobs/JobForm";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export interface NewJobPrefill {
  jobDate?: string;
  startTime?: string;
  endTime?: string;
  customerId?: string;
}

interface NewJobModalProps {
  open: boolean;
  prefill: NewJobPrefill | null;
  onClose: () => void;
  onCreated?: (job: Job) => void;
}

export default function NewJobModal({
  open,
  prefill,
  onClose,
  onCreated,
}: NewJobModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  useEffect(() => {
    if (!open || !prefill?.customerId) {
      setCustomer(null);
      setLoadingCustomer(false);
      return;
    }

    setLoadingCustomer(true);
    fetch(`/api/customers/${prefill.customerId}`)
      .then((r) => r.json())
      .then((data) => setCustomer(data.customer ?? null))
      .finally(() => setLoadingCustomer(false));
  }, [open, prefill?.customerId]);

  if (!open) return null;

  const formKey = [
    prefill?.jobDate,
    prefill?.startTime,
    prefill?.endTime,
    prefill?.customerId,
  ].join("|");

  return (
    <Modal open={open} onClose={onClose} title="New Job" size="xl">
      {loadingCustomer ? (
        <LoadingSpinner />
      ) : (
        <JobForm
          key={formKey}
          inModal
          customerId={prefill?.customerId}
          prefillCustomer={customer}
          prefillDate={prefill?.jobDate}
          prefillStartTime={prefill?.startTime}
          prefillEndTime={prefill?.endTime}
          onCancel={onClose}
          onSuccess={(job) => {
            onCreated?.(job);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
