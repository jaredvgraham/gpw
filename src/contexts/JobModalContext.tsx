"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Job } from "@/types";
import NewJobModal, { type NewJobPrefill } from "@/components/jobs/NewJobModal";
import EditJobModal from "@/components/jobs/EditJobModal";

interface JobModalContextValue {
  openNewJob: (prefill?: NewJobPrefill | null) => void;
  openEditJob: (jobOrId: Job | string) => void;
}

const JobModalContext = createContext<JobModalContextValue | null>(null);

export function notifyJobSaved() {
  window.dispatchEvent(new CustomEvent("gpw:job-saved"));
}

export function JobModalProvider({ children }: { children: ReactNode }) {
  const [newOpen, setNewOpen] = useState(false);
  const [newPrefill, setNewPrefill] = useState<NewJobPrefill | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editJobId, setEditJobId] = useState<string | null>(null);

  const openNewJob = useCallback((prefill?: NewJobPrefill | null) => {
    setNewPrefill(prefill ?? null);
    setNewOpen(true);
  }, []);

  const openEditJob = useCallback((jobOrId: Job | string) => {
    setEditJobId(typeof jobOrId === "string" ? jobOrId : jobOrId._id);
    setEditOpen(true);
  }, []);

  const handleJobSaved = useCallback(() => {
    notifyJobSaved();
  }, []);

  return (
    <JobModalContext.Provider value={{ openNewJob, openEditJob }}>
      {children}
      <NewJobModal
        open={newOpen}
        prefill={newPrefill}
        onClose={() => {
          setNewOpen(false);
          setNewPrefill(null);
          requestAnimationFrame(() => window.scrollTo(0, 0));
        }}
        onCreated={handleJobSaved}
      />
      <EditJobModal
        open={editOpen}
        jobId={editJobId}
        onClose={() => {
          setEditOpen(false);
          setEditJobId(null);
          requestAnimationFrame(() => window.scrollTo(0, 0));
        }}
        onUpdated={handleJobSaved}
      />
    </JobModalContext.Provider>
  );
}

export function useJobModals() {
  const ctx = useContext(JobModalContext);
  if (!ctx) {
    throw new Error("useJobModals must be used within JobModalProvider");
  }
  return ctx;
}
