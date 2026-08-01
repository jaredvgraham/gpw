import mongoose, { Schema, type Model, type Types } from "mongoose";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "converted",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "website",
  "meta_ad",
  "phone",
  "other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface ILead {
  name: string;
  phone: string;
  email?: string;
  town: string;
  howYouFoundUs?: string;
  services: string[];
  message?: string;
  photoUrls: string[];
  squareFootage?: string;
  status: LeadStatus;
  source: LeadSource;
  customer?: Types.ObjectId;
  notes?: string;
  /** Set when imported from legacy Firestore quotes */
  firestoreId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true },
    town: { type: String, required: true, trim: true, index: true },
    howYouFoundUs: { type: String, trim: true },
    services: { type: [String], default: [] },
    message: { type: String, trim: true },
    photoUrls: { type: [String], default: [] },
    squareFootage: { type: String, trim: true },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "new",
      index: true,
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      default: "website",
      index: true,
    },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", index: true },
    notes: { type: String, trim: true },
    firestoreId: { type: String, trim: true, sparse: true, unique: true },
  },
  { timestamps: true },
);

LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ status: 1, createdAt: -1 });

const Lead: Model<ILead> =
  mongoose.models.Lead ?? mongoose.model<ILead>("Lead", LeadSchema);

export default Lead;
