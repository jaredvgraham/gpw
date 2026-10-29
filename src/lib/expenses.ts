export const EXPENSE_TYPES = [
  "Gas",
  "Bleach",
  "Ads",
  "Supplies",
  "Equipment",
  "Other",
] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_COLORS: Record<ExpenseType, string> = {
  Gas: "#ef4444",
  Bleach: "#facc15",
  Ads: "#3b82f6",
  Supplies: "#f97316",
  Equipment: "#171717",
  Other: "#a1a1aa",
};

export const NET_COLOR = "#22c55e";

export const EXPENSE_PAYERS = ["Jared", "Justin"] as const;

export type ExpensePayer = (typeof EXPENSE_PAYERS)[number];
