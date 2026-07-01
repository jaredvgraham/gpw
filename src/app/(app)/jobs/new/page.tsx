"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useJobModals } from "@/contexts/JobModalContext";

function NewJobRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openNewJob } = useJobModals();

  useEffect(() => {
    openNewJob({
      customerId: searchParams.get("customerId") ?? undefined,
      jobDate: searchParams.get("jobDate") ?? undefined,
      startTime: searchParams.get("startTime") ?? undefined,
      endTime: searchParams.get("endTime") ?? undefined,
    });
    router.replace("/jobs");
  }, [openNewJob, router, searchParams]);

  return <LoadingSpinner />;
}

export default function NewJobPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NewJobRedirect />
    </Suspense>
  );
}
