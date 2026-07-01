import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { parseJobDateOnly } from "@/lib/dates";
import { findJobTimeConflict } from "@/lib/job-scheduling";
import { apiError, apiSuccess } from "@/lib/api";
import Customer from "@/models/Customer";
import Job from "@/models/Job";
import { jobSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    const job = await Job.findById(id)
      .populate("customer")
      .populate("services.service");

    if (!job) {
      return apiError("Job not found", 404);
    }

    return apiSuccess(job);
  } catch (error) {
    console.error("GET /api/jobs/[id] error:", error);
    return apiError("Failed to fetch job", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = jobSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const { customerId, customer, ...jobData } = parsed.data;

    const sameDayJobs = await Job.find({
      jobDate: parseJobDateOnly(jobData.jobDate),
      _id: { $ne: id },
    }).populate("customer");

    const conflict = findJobTimeConflict(
      sameDayJobs,
      jobData.startTime,
      jobData.endTime,
      id
    );
    if (conflict) {
      return apiError(conflict, 409);
    }

    const updateData: Record<string, unknown> = {
      ...jobData,
      jobDate: parseJobDateOnly(jobData.jobDate),
    };

    if (customerId) {
      updateData.customer = customerId;
    } else if (customer) {
      const existingJob = await Job.findById(id);
      if (existingJob) {
        await Customer.findByIdAndUpdate(existingJob.customer, customer);
      }
    }

    const job = await Job.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("customer")
      .populate("services.service");

    if (!job) {
      return apiError("Job not found", 404);
    }

    return apiSuccess(job);
  } catch (error) {
    console.error("PATCH /api/jobs/[id] error:", error);
    return apiError("Failed to update job", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const job = await Job.findByIdAndDelete(id);

    if (!job) {
      return apiError("Job not found", 404);
    }

    return apiSuccess({ message: "Job deleted" });
  } catch (error) {
    console.error("DELETE /api/jobs/[id] error:", error);
    return apiError("Failed to delete job", 500);
  }
}
