import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api";
import Service from "@/models/Service";
import { serviceSchema } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const service = await Service.findByIdAndUpdate(id, parsed.data, {
      new: true,
      runValidators: true,
    });

    if (!service) {
      return apiError("Service not found", 404);
    }

    return apiSuccess(service);
  } catch (error) {
    console.error("PATCH /api/services/[id] error:", error);
    return apiError("Failed to update service", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return apiError("Service not found", 404);
    }

    return apiSuccess({ message: "Service deleted" });
  } catch (error) {
    console.error("DELETE /api/services/[id] error:", error);
    return apiError("Failed to delete service", 500);
  }
}
