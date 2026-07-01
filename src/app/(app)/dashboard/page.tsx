"use client";

import { useMemo } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import JobCard from "@/components/jobs/JobCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatCurrency } from "@/lib/utils";
import { computeDashboardStats } from "@/lib/dashboard-stats";
import { Calendar, CheckCircle, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useJobModals } from "@/contexts/JobModalContext";
import { useAppData } from "@/contexts/AppDataContext";

export default function DashboardPage() {
  const { openNewJob } = useJobModals();
  const { jobs, jobsLoading } = useAppData();
  const stats = useMemo(() => computeDashboardStats(jobs), [jobs]);

  if (jobsLoading && jobs.length === 0) return <LoadingSpinner />;

  const statCards = [
    {
      label: "Today's Jobs",
      value: stats.todayJobs.length,
      icon: Calendar,
      color: "text-brand-blue",
      bg: "bg-blue-50",
    },
    {
      label: "Tomorrow's Jobs",
      value: stats.tomorrowJobs.length,
      icon: Calendar,
      color: "text-brand-blue",
      bg: "bg-blue-50",
    },
    {
      label: "Completed This Month",
      value: stats.completedThisMonth,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Est. Revenue This Week",
      value: formatCurrency(stats.estimatedRevenueWeek),
      icon: DollarSign,
      color: "text-brand-red",
      bg: "bg-red-50",
    },
    {
      label: "Est. Revenue This Month",
      value: formatCurrency(stats.estimatedRevenueMonth),
      icon: TrendingUp,
      color: "text-brand-red",
      bg: "bg-red-50",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your power washing schedule"
        action={
          <div className="flex gap-2">
            <Link
              href="/settings"
              className="md:hidden inline-flex items-center rounded-lg border border-brand-border bg-white px-3 py-2 text-sm font-medium text-gray-700"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={() => openNewJob()}
              className="inline-flex items-center rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              + Add Job
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="!p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-lg font-bold text-brand-black">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Today's Jobs">
          {stats.todayJobs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No jobs scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {stats.todayJobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Tomorrow's Jobs">
          {stats.tomorrowJobs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No jobs scheduled for tomorrow.</p>
          ) : (
            <div className="space-y-3">
              {stats.tomorrowJobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </Card>

        <Card title="Upcoming Jobs" className="lg:col-span-2">
          {stats.upcomingJobs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No upcoming jobs.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stats.upcomingJobs.map((job) => (
                <JobCard key={job._id} job={job} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
