export const EXPENSE_TYPES = [
  "Gas",
  "Bleach",
  "Ads",
  "Supplies",
  "Equipment",
  "Other",
] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];
