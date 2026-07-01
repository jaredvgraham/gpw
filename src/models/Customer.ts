import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface ICustomer {
  name: string;
  phone: string;
  email?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  household?: Types.ObjectId;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    streetAddress: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    household: { type: Schema.Types.ObjectId, ref: "Household", index: true },
  },
  { timestamps: true }
);

const Customer: Model<ICustomer> =
  mongoose.models.Customer ?? mongoose.model<ICustomer>("Customer", CustomerSchema);

export default Customer;
