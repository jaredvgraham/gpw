import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api";
import { parseJobDateOnly } from "@/lib/dates";
import { expenseSchema } from "@/lib/validations";
import Expense from "@/models/Expense";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const { id } = await context.params;
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const { note, date, ...rest } = parsed.data;
    const expense = await Expense.findByIdAndUpdate(
      id,
      {
        $set: {
          ...rest,
          date: parseJobDateOnly(date),
          ...(note ? { note } : {}),
        },
        ...(note ? {} : { $unset: { note: 1 } }),
      },
      { new: true, runValidators: true },
    );

    if (!expense) {
      return apiError("Expense not found", 404);
    }

    return apiSuccess(expense);
  } catch (error) {
    console.error("PATCH /api/expenses/[id] error:", error);
    return apiError("Failed to update expense", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const { id } = await context.params;
    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return apiError("Expense not found", 404);
    }

    return apiSuccess({ message: "Expense deleted" });
  } catch (error) {
    console.error("DELETE /api/expenses/[id] error:", error);
    return apiError("Failed to delete expense", 500);
  }
}
