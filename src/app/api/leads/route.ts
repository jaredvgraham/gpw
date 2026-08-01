import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api";
import Lead, { LEAD_STATUSES } from "@/models/Lead";

export async function GET(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const source = searchParams.get("source");

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { town: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status && LEAD_STATUSES.includes(status as (typeof LEAD_STATUSES)[number])) {
      filter.status = status;
    }

    if (source) {
      filter.source = source;
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).limit(500);
    return apiSuccess(leads);
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return apiError("Failed to fetch leads", 500);
  }
}
