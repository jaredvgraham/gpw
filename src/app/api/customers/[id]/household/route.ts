import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { apiError, apiSuccess } from "@/lib/api";
import { requireApiAuth } from "@/lib/api-auth";
import {
  getHouseholdContext,
  linkCustomers,
  unlinkCustomerFromHousehold,
} from "@/lib/household";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json();

    if (body.action === "link") {
      if (!body.targetCustomerId) {
        return apiError("targetCustomerId is required");
      }
      await linkCustomers(id, body.targetCustomerId);
      const contextData = await getHouseholdContext(id);
      return apiSuccess(contextData);
    }

    if (body.action === "unlink") {
      await unlinkCustomerFromHousehold(id);
      const contextData = await getHouseholdContext(id);
      return apiSuccess(contextData);
    }

    return apiError("Invalid action");
  } catch (error) {
    console.error("POST /api/customers/[id]/household error:", error);
    return apiError(error instanceof Error ? error.message : "Household action failed", 400);
  }
}
