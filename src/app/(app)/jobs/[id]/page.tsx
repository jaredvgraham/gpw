"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import JobDetailsModal from "@/components/jobs/JobDetailsModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import type { Job } from "@/types";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchJob() {
    const res = await fetch(`/api/jobs/${id}`);
    if (res.ok) {
      setJob(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchJob();
  }, [id]);

  useEffect(() => {
    const handler = () => fetchJob();
    window.addEventListener("gpw:job-saved", handler);
    return () => window.removeEventListener("gpw:job-saved", handler);
  }, [id]);

  if (loading) return <LoadingSpinner />;

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job not found.</p>
        <Button className="mt-4" onClick={() => router.push("/jobs")}>
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Job Details" />
      <JobDetailsModal
        job={job}
        open
        onClose={() => router.push("/jobs")}
        onUpdated={fetchJob}
      />
    </div>
  );
}
