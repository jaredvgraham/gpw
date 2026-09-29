import mongoose, { Schema, type Model } from "mongoose";
import { EXPENSE_TYPES, type ExpenseType } from "@/lib/expenses";

export interface IExpense {
  type: ExpenseType;
  amount: number;
  date: Date;
  note?: string;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    type: { type: String, enum: EXPENSE_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

ExpenseSchema.index({ date: 1 });
ExpenseSchema.index({ type: 1, date: 1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense ?? mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
