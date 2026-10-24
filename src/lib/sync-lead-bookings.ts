import mongoose from "mongoose";
import Job from "@/models/Job";
import Lead from "@/models/Lead";
import { jobCustomerPopulate } from "@/lib/job-populate";
import { attributeJobs } from "@/lib/owner-metrics";
import type { Job as JobRecord, Lead as LeadRecord } from "@/types";

export async function syncLeadBookings(): Promise<void> {
  const [leadDocs, jobDocs] = await Promise.all([
    Lead.find({ source: { $ne: "phone" } }).lean(),
    Job.find({ status: { $ne: "Cancelled" } }).populate(jobCustomerPopulate).lean(),
  ]);

  const leads = leadDocs.map((lead) => ({
    ...(lead as unknown as LeadRecord),
    _id: String(lead._id),
    job: lead.job ? String(lead.job) : undefined,
  }));
  const jobs = jobDocs.map((job) => ({
    ...(job as unknown as JobRecord),
    _id: String(job._id),
  }));

  const bookedJobByLead = new Map<string, string>();
  for (const item of attributeJobs(jobs, leads).values()) {
    if (item.leadId && !bookedJobByLead.has(item.leadId)) {
      bookedJobByLead.set(item.leadId, item.jobId);
    }
  }

  const stale = leads.flatMap((lead) => {
    if (lead.status !== "converted" || !lead.job || lead.address?.trim()) return [];
    return [
      {
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(lead._id) },
          update: {
            $set: { status: "new" as const },
            $unset: { job: 1 as const, customer: 1 as const },
          },
        },
      },
    ];
  });

  const updates = [...bookedJobByLead.entries()].flatMap(([leadId, jobId]) => {
    const lead = leads.find((item) => item._id === leadId);
    if (!lead) return [];
    if (lead.status === "converted" && lead.job === jobId) return [];

    const job = jobs.find((item) => item._id === jobId);
    const customer = job?.customer;
    const customerId =
      customer && typeof customer === "object" ? customer._id : typeof customer === "string" ? customer : undefined;

    return [
        {
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(leadId) },
            update: {
              $set: {
                status: "converted" as const,
                job: new mongoose.Types.ObjectId(jobId),
                ...(customerId ? { customer: new mongoose.Types.ObjectId(customerId) } : {}),
              },
            },
          },
        },
    ];
  });

  const writes = [...stale, ...updates];
  if (writes.length > 0) await Lead.bulkWrite(writes);
}
