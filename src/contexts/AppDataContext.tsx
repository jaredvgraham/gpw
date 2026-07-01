"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { Job, Service } from "@/types";

interface AppDataContextValue {
  jobs: Job[];
  services: Service[];
  jobsLoading: boolean;
  servicesLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  refreshJobs: (silent?: boolean) => Promise<void>;
  refreshServices: (silent?: boolean) => Promise<void>;
  refreshAll: (silent?: boolean) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function notifyServicesChanged() {
  window.dispatchEvent(new CustomEvent("gpw:services-changed"));
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hasLoadedRef = useRef(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const refreshJobs = useCallback(async (silent = false) => {
    if (silent) {
      setIsSyncing(true);
    } else {
      setJobsLoading(true);
    }

    try {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
      setLastSyncedAt(new Date());
    } catch {
      if (!silent) setJobs([]);
    } finally {
      if (silent) setIsSyncing(false);
      else setJobsLoading(false);
    }
  }, []);

  const refreshServices = useCallback(async (silent = false) => {
    if (silent) {
      setIsSyncing(true);
    } else {
      setServicesLoading(true);
    }

    try {
      const res = await fetch("/api/services", { cache: "no-store" });
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
      setLastSyncedAt(new Date());
    } catch {
      if (!silent) setServices([]);
    } finally {
      if (silent) setIsSyncing(false);
      else setServicesLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async (silent = false) => {
    if (silent) {
      setIsSyncing(true);
    } else {
      setJobsLoading(true);
      setServicesLoading(true);
    }

    try {
      const [jobsRes, servicesRes] = await Promise.all([
        fetch("/api/jobs", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" }),
      ]);
      const jobsData = await jobsRes.json();
      const servicesData = await servicesRes.json();
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setLastSyncedAt(new Date());
    } catch {
      if (!silent) {
        setJobs([]);
        setServices([]);
      }
    } finally {
      if (silent) setIsSyncing(false);
      else {
        setJobsLoading(false);
        setServicesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshAll(hasLoadedRef.current);
    hasLoadedRef.current = true;
  }, [pathname, refreshAll]);

  useEffect(() => {
    const onJobSaved = () => {
      refreshJobs(true);
    };
    const onServicesChanged = () => {
      refreshServices(true);
    };

    window.addEventListener("gpw:job-saved", onJobSaved);
    window.addEventListener("gpw:services-changed", onServicesChanged);
    return () => {
      window.removeEventListener("gpw:job-saved", onJobSaved);
      window.removeEventListener("gpw:services-changed", onServicesChanged);
    };
  }, [refreshJobs, refreshServices]);

  return (
    <AppDataContext.Provider
      value={{
        jobs,
        services,
        jobsLoading,
        servicesLoading,
        isSyncing,
        lastSyncedAt,
        refreshJobs,
        refreshServices,
        refreshAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
