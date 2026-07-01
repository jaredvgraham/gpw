"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useJobModals } from "@/contexts/JobModalContext";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { openEditJob } = useJobModals();

  useEffect(() => {
    if (!id) return;
    openEditJob(id);
    router.replace(`/jobs/${id}`);
  }, [id, openEditJob, router]);

  return <LoadingSpinner />;
}
