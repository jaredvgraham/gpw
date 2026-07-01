import mongoose, { Schema, type Model } from "mongoose";

export interface IService {
  name: string;
  description?: string;
  basePrice?: number;
  active: boolean;
}

const ServiceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    basePrice: { type: Number, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service: Model<IService> =
  mongoose.models.Service ?? mongoose.model<IService>("Service", ServiceSchema);

export default Service;
