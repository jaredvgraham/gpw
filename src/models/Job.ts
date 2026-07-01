import mongoose, { Schema, type Model } from "mongoose";
import { JOB_STATUSES } from "@/lib/constants";
import "./Customer";
import "./Service";

export interface IJobService {
  service?: mongoose.Types.ObjectId;
  name: string;
  customServiceName?: string;
  notes?: string;
}

export interface IJob {
  customer: mongoose.Types.ObjectId;
  jobDate: Date;
  startTime: string;
  endTime: string;
  status: (typeof JOB_STATUSES)[number];
  services: IJobService[];
  finalPrice?: number;
  paid?: boolean;
  internalNotes?: string;
  photoNotes?: string;
}

const JobServiceSchema = new Schema<IJobService>(
  {
    service: { type: Schema.Types.ObjectId, ref: "Service" },
    name: { type: String, required: true, trim: true },
    customServiceName: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const JobSchema = new Schema<IJob>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    jobDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: "Scheduled",
    },
    services: { type: [JobServiceSchema], required: true },
    finalPrice: { type: Number, min: 0 },
    paid: { type: Boolean, default: false },
    internalNotes: { type: String, trim: true },
    photoNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

JobSchema.index({ jobDate: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ customer: 1 });

const Job: Model<IJob> =
  mongoose.models.Job ?? mongoose.model<IJob>("Job", JobSchema);

export default Job;
