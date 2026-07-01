import { z } from "zod";
import { JOB_STATUSES } from "@/lib/constants";

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
});

export const jobServiceSchema = z.object({
  service: z.string().optional(),
  name: z.string().min(1, "Service name is required"),
  customServiceName: z.string().optional(),
  notes: z.string().optional(),
});

export const jobSchema = z
  .object({
    customerId: z.string().optional(),
    customer: customerSchema.optional(),
    jobDate: z.string().min(1, "Job date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    status: z.enum(JOB_STATUSES).default("Scheduled"),
    services: z.array(jobServiceSchema).min(1, "At least one service is required"),
    finalPrice: z.preprocess(
      (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
      z.number().min(0, "Price cannot be negative").optional()
    ),
    paid: z.boolean().default(false),
    internalNotes: z.string().optional(),
    photoNotes: z.string().optional(),
  })
  .refine((data) => timeToMinutes(data.endTime) > timeToMinutes(data.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine((data) => data.customerId || data.customer, {
    message: "Customer is required",
    path: ["customer"],
  });

export const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  basePrice: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0, "Price cannot be negative").optional()
  ),
  active: z.boolean(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
export type JobFormData = z.infer<typeof jobSchema>;
export type ServiceFormData = z.infer<typeof serviceSchema>;
