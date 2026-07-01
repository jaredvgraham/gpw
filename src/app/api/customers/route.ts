import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireApiAuth } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api";
import Customer from "@/models/Customer";
import { customerSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const city = searchParams.get("city");

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { streetAddress: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (city) {
      filter.city = { $regex: city, $options: "i" };
    }

    const customers = await Customer.find(filter).sort({ name: 1 }).populate("household");

    const householdIds = [
      ...new Set(
        customers
          .map((customer) => {
            if (!customer.household) return null;
            return typeof customer.household === "object"
              ? String(customer.household._id)
              : String(customer.household);
          })
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const memberCounts = new Map<string, number>();
    if (householdIds.length > 0) {
      const counts = await Customer.aggregate<{ _id: string; count: number }>([
        { $match: { household: { $in: householdIds } } },
        { $group: { _id: "$household", count: { $sum: 1 } } },
      ]);
      for (const row of counts) {
        memberCounts.set(String(row._id), row.count);
      }
    }

    const payload = customers.map((customer) => {
      const householdId = customer.household
        ? typeof customer.household === "object"
          ? String(customer.household._id)
          : String(customer.household)
        : undefined;
      return {
        ...customer.toObject(),
        householdMemberCount: householdId ? memberCounts.get(householdId) ?? 1 : 1,
      };
    });

    return apiSuccess(payload);
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return apiError("Failed to fetch customers", 500);
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;

  try {
    await connectDB();
    const body = await request.json();
    const parsed = customerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid data");
    }

    const customer = await Customer.create(parsed.data);
    return apiSuccess(customer, 201);
  } catch (error) {
    console.error("POST /api/customers error:", error);
    return apiError("Failed to create customer", 500);
  }
}
