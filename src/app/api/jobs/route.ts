import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { parseJobDateOnly } from "@/lib/dates";
import { findJobTimeConflict } from "@/lib/job-scheduling";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAuth } from "@/lib/api-auth";
import Customer from "@/models/Customer";
import Job from "@/models/Job";
import { jobSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const service = searchParams.get("service");
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const customerId = searchParams.get("customerId");

    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (customerId) filter.customer = customerId;

    if (startDate || endDate) {
      filter.jobDate = {};
      if (startDate) (filter.jobDate as Record<string, Date>).$gte = parseJobDateOnly(startDate);
      if (endDate) (filter.jobDate as Record<string, Date>).$lte = parseJobDateOnly(endDate);
    }

    if (service) {
      filter["services.name"] = { $regex: service, $options: "i" };
    }

    let jobs = await Job.find(filter)
      .populate("customer")
      .populate("services.service")
      .sort({ jobDate: 1, startTime: 1 });

    if (city) {
      jobs = jobs.filter((job) => {
        const customer = job.customer as { city?: string } | null;
        return customer?.city?.toLowerCase().includes(city.toLowerCase());
      });
    }

    if (search) {
      const term = search.toLowerCase();
      jobs = jobs.filter((job) => {
        const customer = job.customer as {
          name?: string;
          phone?: string;
          streetAddress?: string;
        } | null;
        return (
          customer?.name?.toLowerCase().includes(term) ||
          customer?.phone?.toLowerCase().includes(term) ||
          customer?.streetAddress?.toLowerCase().includes(term)
        );
      });
    }

    return apiSuccess(jobs);
  } catch (error) {
    console.error("GET /api/jobs error:", error);
    return apiError("Failed to fetch jobs", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const body = await request.json();
    const parsed = jobSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const { customerId, customer, ...jobData } = parsed.data;

    let customerDoc;
    if (customerId) {
      customerDoc = await Customer.findById(customerId);
      if (!customerDoc) {
        return apiError("Customer not found", 404);
      }
    } else if (customer) {
      customerDoc = await Customer.create(customer);
    } else {
      return apiError("Customer is required");
    }

    const sameDayJobs = await Job.find({
      jobDate: parseJobDateOnly(jobData.jobDate),
    }).populate("customer");

    const conflict = findJobTimeConflict(
      sameDayJobs,
      jobData.startTime,
      jobData.endTime
    );
    if (conflict) {
      return apiError(conflict, 409);
    }

    const job = await Job.create({
      ...jobData,
      customer: customerDoc._id,
      jobDate: parseJobDateOnly(jobData.jobDate),
    });

    const populated = await Job.findById(job._id)
      .populate("customer")
      .populate("services.service");

    return apiSuccess(populated, 201);
  } catch (error) {
    console.error("POST /api/jobs error:", error);
    return apiError("Failed to create job", 500);
  }
}
