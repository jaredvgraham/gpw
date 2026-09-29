export const EXPENSE_TYPES = [
  "Gas",
  "Bleach",
  "Ads",
  "Supplies",
  "Equipment",
  "Other",
] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_PAYERS = ["Jared", "Justin"] as const;

export type ExpensePayer = (typeof EXPENSE_PAYERS)[number];
