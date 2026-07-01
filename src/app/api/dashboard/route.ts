import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { jobCustomerPopulate } from "@/lib/job-populate";
import { getJobDateOnly } from "@/lib/dates";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAuth } from "@/lib/api-auth";
import Job from "@/models/Job";

export async function GET(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const tomorrow = format(addDays(now, 1), "yyyy-MM-dd");
    const weekStart = format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

    const allJobs = await Job.find()
      .populate(jobCustomerPopulate)
      .populate("services.service")
      .sort({ jobDate: 1, startTime: 1 });

    const todayJobs = allJobs.filter((job) => getJobDateOnly(job.jobDate) === today);

    const tomorrowJobs = allJobs.filter((job) => getJobDateOnly(job.jobDate) === tomorrow);

    const upcomingJobs = allJobs.filter(
      (job) =>
        getJobDateOnly(job.jobDate) > tomorrow &&
        job.status !== "Completed" &&
        job.status !== "Cancelled"
    );

    const completedThisMonth = allJobs.filter(
      (job) =>
        job.status === "Completed" &&
        getJobDateOnly(job.jobDate) >= monthStart &&
        getJobDateOnly(job.jobDate) <= monthEnd
    ).length;

    const weekJobs = allJobs.filter(
      (job) =>
        getJobDateOnly(job.jobDate) >= weekStart && getJobDateOnly(job.jobDate) <= weekEnd
    );

    const monthJobs = allJobs.filter(
      (job) =>
        getJobDateOnly(job.jobDate) >= monthStart && getJobDateOnly(job.jobDate) <= monthEnd
    );

    const estimatedRevenueWeek = weekJobs.reduce(
      (sum, job) => sum + (job.finalPrice ?? 0),
      0
    );

    const estimatedRevenueMonth = monthJobs.reduce(
      (sum, job) => sum + (job.finalPrice ?? 0),
      0
    );

    return apiSuccess({
      todayJobs,
      tomorrowJobs,
      upcomingJobs: upcomingJobs.slice(0, 10),
      completedThisMonth,
      estimatedRevenueWeek,
      estimatedRevenueMonth,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return apiError("Failed to fetch dashboard data", 500);
  }
}
