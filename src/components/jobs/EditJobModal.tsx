"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/types";
import Modal from "@/components/ui/Modal";
import JobForm from "@/components/jobs/JobForm";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface EditJobModalProps {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
  onUpdated?: (job: Job) => void;
}

export default function EditJobModal({
  open,
  jobId,
  onClose,
  onUpdated,
}: EditJobModalProps) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !jobId) {
      setJob(null);
      return;
    }

    setLoading(true);
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then(setJob)
      .finally(() => setLoading(false));
  }, [open, jobId]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Job" size="xl">
      {loading ? (
        <LoadingSpinner />
      ) : job ? (
        <JobForm
          key={job._id}
          job={job}
          inModal
          onCancel={onClose}
          onSuccess={(saved) => {
            onUpdated?.(saved);
            onClose();
          }}
        />
      ) : (
        <p className="text-sm text-gray-500 py-8 text-center">Job not found.</p>
      )}
    </Modal>
  );
}
