import { NextRequest } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api";
import { parseJobDateOnly } from "@/lib/dates";
import { EXPENSE_TYPES } from "@/lib/expenses";
import Expense from "@/models/Expense";

const expenseSchema = z.object({
  type: z.enum(EXPENSE_TYPES),
  amount: z.preprocess(
    (val) => {
      if (val === "" || val === undefined || val === null) return undefined;
      const num = Number(val);
      return Number.isNaN(num) ? undefined : num;
    },
    z.number({ message: "Amount is required" }).min(0, "Amount cannot be negative"),
  ),
  date: z.string().min(1, "Date is required"),
  note: z.string().trim().optional(),
});

export async function GET(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter: Record<string, unknown> = {};
    if (from || to) {
      filter.date = {};
      if (from) (filter.date as Record<string, Date>).$gte = parseJobDateOnly(from);
      if (to) (filter.date as Record<string, Date>).$lte = parseJobDateOnly(to);
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    return apiSuccess(expenses);
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return apiError("Failed to fetch expenses", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const expense = await Expense.create({
      type: parsed.data.type,
      amount: parsed.data.amount,
      date: parseJobDateOnly(parsed.data.date),
      note: parsed.data.note || undefined,
    });

    return apiSuccess(expense, 201);
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return apiError("Failed to create expense", 500);
  }
}
