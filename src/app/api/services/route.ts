import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api";
import { sortServicesForDisplay } from "@/lib/services";
import Service from "@/models/Service";
import { serviceSchema } from "@/lib/validations";
import { seedDefaultServices } from "@/lib/seed-services";

export async function GET() {
  try {
    await connectDB();
    await seedDefaultServices();

    const services = sortServicesForDisplay(await Service.find());
    return apiSuccess(services);
  } catch (error) {
    console.error("GET /api/services error:", error);
    return apiError("Failed to fetch services", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const service = await Service.create(parsed.data);
    return apiSuccess(service, 201);
  } catch (error) {
    console.error("POST /api/services error:", error);
    return apiError("Failed to create service", 500);
  }
}
