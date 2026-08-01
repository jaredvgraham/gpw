import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api";
import Lead, { LEAD_STATUSES } from "@/models/Lead";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().trim().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true },
    );

    if (!lead) {
      return apiError("Lead not found", 404);
    }

    return apiSuccess(lead);
  } catch (error) {
    console.error("PATCH /api/leads/[id] error:", error);
    return apiError("Failed to update lead", 500);
  }
}
