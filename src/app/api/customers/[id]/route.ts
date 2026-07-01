import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api";
import Customer from "@/models/Customer";
import Job from "@/models/Job";
import { customerSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const customer = await Customer.findById(id);

    if (!customer) {
      return apiError("Customer not found", 404);
    }

    const jobs = await Job.find({ customer: id })
      .populate("customer")
      .populate("services.service")
      .sort({ jobDate: -1 });

    return apiSuccess({ customer, jobs });
  } catch (error) {
    console.error("GET /api/customers/[id] error:", error);
    return apiError("Failed to fetch customer", 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    return apiSuccess(customer);
  } catch (error) {
    console.error("PATCH /api/customers/[id] error:", error);
    return apiError("Failed to update customer", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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
