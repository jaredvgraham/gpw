import mongoose, { Schema, type Model } from "mongoose";

export interface IHousehold {
  streetAddress: string;
  city: string;
  state?: string;
  zipCode?: string;
  addressKey: string;
}

const HouseholdSchema = new Schema<IHousehold>(
  {
    streetAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    addressKey: { type: String, required: true, trim: true, index: true },
  },
  { timestamps: true }
);

HouseholdSchema.index({ addressKey: 1 });

const Household: Model<IHousehold> =
  mongoose.models.Household ?? mongoose.model<IHousehold>("Household", HouseholdSchema);

export default Household;
