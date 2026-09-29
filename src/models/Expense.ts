import mongoose, { Schema, type Model } from "mongoose";
import { EXPENSE_PAYERS, EXPENSE_TYPES, type ExpensePayer, type ExpenseType } from "@/lib/expenses";

export interface IExpense {
  type: ExpenseType;
  amount: number;
  paidBy: ExpensePayer;
  date: Date;
  note?: string;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    type: { type: String, enum: EXPENSE_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidBy: { type: String, enum: EXPENSE_PAYERS, required: true },
    date: { type: Date, required: true },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

ExpenseSchema.index({ date: 1 });
ExpenseSchema.index({ type: 1, date: 1 });

if (mongoose.models.Expense) {
  mongoose.deleteModel("Expense");
}

const Expense: Model<IExpense> = mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
