import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { jobCustomerPopulate } from "@/lib/job-populate";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAuth } from "@/lib/api-auth";
import {
  ensureHouseholdForCustomer,
  getHouseholdContext,
} from "@/lib/household";
import Customer from "@/models/Customer";
import Job from "@/models/Job";
import { customerSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const { id } = await context.params;
    const contextData = await getHouseholdContext(id);

    if (!contextData) {
      return apiError("Customer not found", 404);
    }

    const memberIds = contextData.members.map((member) => member._id);
    const jobs = await Job.find({ customer: { $in: memberIds } })
      .populate(jobCustomerPopulate)
      .populate("services.service")
      .sort({ jobDate: -1 });

    const ownJobs = jobs.filter((job) => {
      const jobCustomerId =
        typeof job.customer === "object" && job.customer !== null
          ? String((job.customer as { _id: unknown })._id)
          : String(job.customer);
      return jobCustomerId === id;
    });
    const householdJobs = jobs.filter((job) => {
      const jobCustomerId =
        typeof job.customer === "object" && job.customer !== null
          ? String((job.customer as { _id: unknown })._id)
          : String(job.customer);
      return jobCustomerId !== id;
    });

    return apiSuccess({
      customer: contextData.customer,
      household: contextData.household,
      householdMembers: contextData.members.filter((member) => String(member._id) !== id),
      householdSuggestions: contextData.suggestions,
      jobs: ownJobs,
      householdJobs,
    });
  } catch (error) {
    console.error("GET /api/customers/[id] error:", error);
    return apiError("Failed to fetch customer", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const customer = await Customer.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return apiError("Customer not found", 404);
    }

    await ensureHouseholdForCustomer(id);

    return apiSuccess(customer);
  } catch (error) {
    console.error("PATCH /api/customers/[id] error:", error);
    return apiError("Failed to update customer", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const { id } = await context.params;
    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return apiError("Customer not found", 404);
    }

    return apiSuccess({ message: "Customer deleted" });
  } catch (error) {
    console.error("DELETE /api/customers/[id] error:", error);
    return apiError("Failed to delete customer", 500);
  }
}
