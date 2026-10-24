"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import TimeSelect from "@/components/ui/TimeSelect";
import Button from "@/components/ui/Button";
import { getJobDateOnly } from "@/lib/dates";
import { findJobTimeConflict, timeToMinutes } from "@/lib/job-scheduling";
import { jobSchema } from "@/lib/validations";
import type { z } from "zod";
import { JOB_STATUSES, type JobStatus } from "@/lib/constants";
import type { Job, Lead, Service, Customer } from "@/types";
import { getJobDuration } from "@/lib/utils";
import { sortServicesForDisplay } from "@/lib/services";
import { useAppData } from "@/contexts/AppDataContext";
import { Calendar, User, MapPin, Wrench, DollarSign, FileText } from "lucide-react";

interface JobFormProps {
  job?: Job;
  customerId?: string;
  prefillCustomer?: Customer | null;
  prefillDate?: string;
  prefillStartTime?: string;
  prefillEndTime?: string;
  inModal?: boolean;
  onSuccess?: (job: Job) => void;
  onCancel?: () => void;
}

type LeadField = "name" | "phone" | "streetAddress" | "city";

function leadQueryReady(field: LeadField, query: string): boolean {
  if (field === "phone") return query.replace(/\D/g, "").length >= 3;
  return query.trim().length >= 2;
}

function leadMatchesField(lead: Lead, field: LeadField, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (field === "phone") {
    const digits = q.replace(/\D/g, "");
    return lead.phone.replace(/\D/g, "").includes(digits);
  }
  if (field === "name") return lead.name.toLowerCase().includes(q);
  if (field === "streetAddress") return (lead.address ?? "").toLowerCase().includes(q);
  return lead.town.toLowerCase().includes(q);
}

function matchLeadService(label: string, catalog: Service[]): Service | null {
  const text = label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const rules: [RegExp, string][] = [
    [/\bhouse\b/, "House wash"],
    [/\bwindow/, "Window cleaning"],
    [/\broof\b/, "Roof wash"],
    [/\bdriveway\b/, "Driveway cleaning"],
    [/\bpatio\b/, "Patio cleaning"],
    [/\bwalkway\b/, "Walkway cleaning"],
    [/\bfence\b/, "Fence cleaning"],
    [/\bgutter\b/, "Gutter cleaning"],
    [/\bstone\b/, "Stone walls"],
    [/\bfront deck\b/, "Front deck"],
    [/\bback deck\b/, "Back deck"],
  ];
  for (const [pattern, name] of rules) {
    if (!pattern.test(text)) continue;
    return catalog.find((service) => service.name === name) ?? null;
  }
  return catalog.find((service) => service.name.toLowerCase() === text && service.name !== "Other") ?? null;
}

function servicesFromLead(lead: Lead, catalog: Service[]) {
  const matched: Service[] = [];
  const unmatched: string[] = [];
  for (const label of lead.services) {
    const service = matchLeadService(label, catalog);
    if (service) {
      if (!matched.some((item) => item._id === service._id)) matched.push(service);
    } else if (label.trim()) {
      unmatched.push(label.trim());
    }
  }
  const rows = matched.map((service) => ({
    service: service._id,
    name: service.name,
    customServiceName: "",
    notes: "",
  }));
  const other = catalog.find((service) => service.name === "Other");
  if (other && unmatched.length > 0) {
    rows.push({
      service: other._id,
      name: other.name,
      customServiceName: unmatched.join(", "),
      notes: "",
    });
  }
  return rows;
}

function leadPlace(lead: Lead): string {
  return lead.address ? `${lead.address}, ${lead.town}` : lead.town;
}

function LeadMatchList({ matches, onPick }: { matches: Lead[]; onPick: (lead: Lead) => void }) {
  if (matches.length === 0) return null;
  return (
    <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-brand-border bg-white shadow-lg">
      {matches.map((lead) => (
        <li key={lead._id}>
          <button
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onPick(lead)}
            className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left active:bg-brand-gray"
          >
            <span className="text-sm font-semibold text-brand-black">{lead.name}</span>
            <span className="text-xs text-gray-500">
              {lead.phone}
              {" · "}
              {leadPlace(lead)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-4 w-4 text-brand-blue" />
      <h3 className="text-sm font-semibold text-brand-black">{children}</h3>
    </div>
  );
}

export default function JobForm({
  job,
  customerId,
  prefillCustomer,
  prefillDate,
  prefillStartTime,
  prefillEndTime,
  inModal = false,
  onSuccess,
  onCancel,
}: JobFormProps) {
  const router = useRouter();
  const { jobs, services } = useAppData();
  const isEditing = !!job;
  const orderedServices = useMemo(
    () => sortServicesForDisplay(services.filter((service) => service.active)),
    [services]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [scheduleConflict, setScheduleConflict] = useState<string | null>(null);
  const [leadFocus, setLeadFocus] = useState<LeadField | null>(null);
  const [leadMatchesOpen, setLeadMatchesOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const hideLeadMatches = useRef<number | null>(null);

  const customer =
    (job && typeof job.customer === "object" ? (job.customer as Customer) : null) ??
    prefillCustomer ??
    null;

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      customerId: customerId ?? customer?._id ?? "",
      customer: customer
        ? {
            name: customer.name,
            phone: customer.phone,
            email: customer.email ?? "",
            streetAddress: customer.streetAddress ?? "",
            city: customer.city ?? "",
          }
        : { name: "", phone: "", email: "", streetAddress: "", city: "" },
      jobDate: job ? getJobDateOnly(job.jobDate) : prefillDate ?? "",
      startTime: job?.startTime ?? prefillStartTime ?? "08:00",
      endTime: job?.endTime ?? prefillEndTime ?? "12:00",
      status: job?.status ?? "Scheduled",
      services: job?.services?.length
        ? job.services.map((s) => ({
            service: typeof s.service === "object" ? s.service?._id : s.service ?? "",
            name: s.name,
            customServiceName: s.customServiceName ?? "",
            notes: s.notes ?? "",
          }))
        : [],
      finalPrice: job?.finalPrice,
      paid: job?.paid ?? false,
      internalNotes: job?.internalNotes ?? "",
    },
  });

  const { append, remove, replace } = useFieldArray({ control, name: "services" });
  const jobDate = watch("jobDate");
  const startTime = watch("startTime");
  const endTime = watch("endTime");
  const selectedServices = watch("services");
  const isPaid = watch("paid");
  const customerName = watch("customer.name") ?? "";
  const customerPhone = watch("customer.phone") ?? "";
  const customerStreet = watch("customer.streetAddress") ?? "";
  const customerCity = watch("customer.city") ?? "";

  useEffect(() => {
    if (isEditing) return;
    let cancelled = false;
    fetch("/api/leads")
      .then(async (response) => {
        if (!response.ok) return [];
        return response.json() as Promise<Lead[]>;
      })
      .then((data) => {
        if (!cancelled) setLeads(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLeads([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditing]);

  const leadQuery =
    leadFocus === "name"
      ? customerName
      : leadFocus === "phone"
        ? customerPhone
        : leadFocus === "streetAddress"
          ? customerStreet
          : leadFocus === "city"
            ? customerCity
            : "";

  const leadMatches = useMemo(() => {
    if (isEditing || !leadFocus || !leadMatchesOpen || !leadQueryReady(leadFocus, leadQuery)) return [];
    return leads.filter((lead) => leadMatchesField(lead, leadFocus, leadQuery)).slice(0, 6);
  }, [isEditing, leadFocus, leadMatchesOpen, leadQuery, leads]);

  function showLeadMatches(field: LeadField) {
    if (hideLeadMatches.current) window.clearTimeout(hideLeadMatches.current);
    setLeadFocus(field);
    setLeadMatchesOpen(true);
  }

  function applyLead(lead: Lead) {
    setValue("customer.name", lead.name, { shouldDirty: true, shouldValidate: true });
    setValue("customer.phone", lead.phone, { shouldDirty: true, shouldValidate: true });
    setValue("customer.email", lead.email ?? "", { shouldDirty: true });
    setValue("customer.streetAddress", lead.address ?? "", { shouldDirty: true, shouldValidate: true });
    setValue("customer.city", lead.town, { shouldDirty: true, shouldValidate: true });
    const rows = servicesFromLead(lead, orderedServices);
    if (rows.length > 0) replace(rows);
    const note = [lead.message?.trim(), lead.squareFootage?.trim() ? `About ${lead.squareFootage.trim()} sq ft` : ""]
      .filter(Boolean)
      .join("\n");
    if (note && !watch("internalNotes")?.trim()) {
      setValue("internalNotes", note, { shouldDirty: true });
    }
    setLeadMatchesOpen(false);
  }

  function leadFieldProps(field: LeadField) {
    const registration = register(
      field === "name"
        ? "customer.name"
        : field === "phone"
          ? "customer.phone"
          : field === "streetAddress"
            ? "customer.streetAddress"
            : "customer.city"
    );
    return {
      ...registration,
      onFocus: () => showLeadMatches(field),
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        showLeadMatches(field);
        registration.onChange(event);
      },
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
        registration.onBlur(event);
        hideLeadMatches.current = window.setTimeout(() => setLeadMatchesOpen(false), 180);
      },
    };
  }

  const dayJobs = useMemo(() => {
    if (!jobDate) return [];
    return jobs.filter((existing) => getJobDateOnly(existing.jobDate) === jobDate);
  }, [jobs, jobDate]);

  useEffect(() => {
    if (!jobDate || !startTime || !endTime) {
      setScheduleConflict(null);
      return;
    }

    if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      setScheduleConflict(null);
      return;
    }

    const conflict = findJobTimeConflict(dayJobs, startTime, endTime, job?._id);
    setScheduleConflict(conflict);
  }, [jobDate, startTime, endTime, dayJobs, job?._id]);

  function toggleService(service: Service) {
    const existing = selectedServices?.findIndex((s) => s.name === service.name) ?? -1;
    if (existing >= 0) {
      remove(existing);
    } else {
      append({
        service: service._id,
        name: service.name,
        customServiceName: "",
        notes: "",
      });
    }
  }

  async function onSubmit(data: z.infer<typeof jobSchema>) {
    const conflict = findJobTimeConflict(dayJobs, data.startTime, data.endTime, job?._id);
    if (conflict) {
      setScheduleConflict(conflict);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const url = job ? `/api/jobs/${job._id}` : "/api/jobs";
      const method = job ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save job");
      }

      const saved = await res.json();
      if (onSuccess) {
        onSuccess(saved);
      } else {
        router.push(`/jobs/${saved._id}`);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save job");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    if (onCancel) onCancel();
    else router.back();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={inModal ? "pb-4" : "pb-20 md:pb-0"}
    >
      <input type="hidden" {...register("customerId")} />

      <div
        className={
          inModal
            ? "overflow-hidden"
            : "rounded-2xl bg-white border border-brand-border shadow-sm overflow-hidden"
        }
      >
        {!inModal && (
          <div className="px-5 py-4 md:px-8 md:py-5 border-b border-brand-border bg-brand-gray/50">
            <h2 className="text-lg font-bold text-brand-black">
              {job ? "Edit Job" : "New Job"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Fill in the details below — everything saves together.
            </p>
          </div>
        )}

        <div
          className={
            inModal
              ? "space-y-8 md:grid md:grid-cols-2 md:items-start md:gap-x-8 md:gap-y-6 md:space-y-0"
              : "space-y-8 px-5 py-6 md:grid md:grid-cols-2 md:items-start md:gap-x-8 md:gap-y-6 md:space-y-0 md:px-8 md:py-8"
          }
        >
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-brand-red md:col-span-2">
              {error}
            </div>
          )}

          {/* When */}
          <section className="md:col-span-2">
            <SectionLabel icon={Calendar}>When is the job?</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Date"
                type="date"
                required
                {...register("jobDate")}
                error={errors.jobDate?.message}
              />
              <Controller
                name="startTime"
                control={control}
                render={({ field }) => (
                  <TimeSelect
                    label="Start"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.startTime?.message}
                    required
                  />
                )}
              />
              <Controller
                name="endTime"
                control={control}
                render={({ field }) => (
                  <TimeSelect
                    label="End"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.endTime?.message}
                    required
                  />
                )}
              />
            </div>
            {scheduleConflict && (
              <p className="mt-2 text-sm text-brand-red" role="alert">
                {scheduleConflict}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-brand-blue">
                {startTime && endTime ? getJobDuration(startTime, endTime) : "Set times above"}
              </span>
              {isEditing && (
                <div className="flex-1 min-w-[140px] max-w-xs">
                  <Select
                    label="Status"
                    options={JOB_STATUSES.map((s) => ({ value: s, label: s }))}
                    value={watch("status")}
                    onChange={(e) => setValue("status", e.target.value as JobStatus)}
                  />
                </div>
              )}
            </div>
          </section>

          <hr className="border-brand-border md:hidden" />

          {/* Who */}
          <section>
            <SectionLabel icon={User}>Customer</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  label="Name"
                  required
                  placeholder="John Smith"
                  autoComplete="off"
                  {...leadFieldProps("name")}
                  error={errors.customer?.name?.message}
                />
                {leadFocus === "name" && <LeadMatchList matches={leadMatches} onPick={applyLead} />}
              </div>
              <div className="relative">
                <Input
                  label="Phone"
                  required
                  type="tel"
                  placeholder="(555) 123-4567"
                  autoComplete="off"
                  {...leadFieldProps("phone")}
                  error={errors.customer?.phone?.message}
                />
                {leadFocus === "phone" && <LeadMatchList matches={leadMatches} onPick={applyLead} />}
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="optional"
                className="sm:col-span-2"
                {...register("customer.email")}
                error={errors.customer?.email?.message}
              />
            </div>
          </section>

          <hr className="border-brand-border md:hidden" />

          {/* Where */}
          <section>
            <SectionLabel icon={MapPin}>Job location</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative sm:col-span-2">
                <Input
                  label="Street address"
                  required
                  placeholder="123 Main St"
                  autoComplete="off"
                  {...leadFieldProps("streetAddress")}
                  error={errors.customer?.streetAddress?.message}
                />
                {leadFocus === "streetAddress" && <LeadMatchList matches={leadMatches} onPick={applyLead} />}
              </div>
              <div className="relative">
                <Input
                  label="Town / city"
                  required
                  placeholder="Springfield"
                  autoComplete="off"
                  {...leadFieldProps("city")}
                  error={errors.customer?.city?.message}
                />
                {leadFocus === "city" && <LeadMatchList matches={leadMatches} onPick={applyLead} />}
              </div>
            </div>
          </section>

          <hr className="border-brand-border md:hidden" />

          {/* Services */}
          <section className="md:col-span-2">
            <SectionLabel icon={Wrench}>Services</SectionLabel>
            <p className="text-sm text-gray-500 -mt-2 mb-3">Select at least one service.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {orderedServices.map((service) => {
                const selected = selectedServices?.some((s) => s.name === service.name);
                return (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all active:scale-[0.98] ${
                      selected
                        ? "border-brand-blue bg-blue-50 text-brand-blue"
                        : "border-brand-border text-gray-700 bg-white"
                    }`}
                  >
                    {service.name}
                  </button>
                );
              })}
            </div>
            {errors.services && (
              <p className="text-xs text-brand-red mt-2">{errors.services.message}</p>
            )}
            {selectedServices?.map((s, index) =>
              s.name === "Other" ? (
                <div key={`other-${index}`} className="mt-3">
                  <Input
                    label="Custom service"
                    required
                    {...register(`services.${index}.customServiceName`)}
                    placeholder="Describe the service"
                  />
                </div>
              ) : null
            )}
          </section>

          <hr className="border-brand-border md:hidden" />

          {/* Pricing */}
          <section>
            <SectionLabel icon={DollarSign}>Pricing</SectionLabel>
            <div className={isEditing ? "flex flex-col sm:flex-row sm:items-end gap-4" : ""}>
              <div className={isEditing ? "flex-1" : ""}>
                <Input
                  label="Final price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  {...register("finalPrice")}
                  error={errors.finalPrice?.message}
                />
              </div>
              {isEditing && (
                <label
                  className={`flex items-center justify-center gap-3 cursor-pointer rounded-xl border-2 px-5 py-3 min-h-[46px] transition-colors ${
                    isPaid
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-brand-border bg-white text-gray-600"
                  }`}
                >
                  <input type="checkbox" {...register("paid")} className="sr-only" />
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                      isPaid ? "border-green-500 bg-green-500 text-white" : "border-gray-300"
                    }`}
                  >
                    {isPaid && "✓"}
                  </span>
                  <span className="text-sm font-semibold">Paid in full</span>
                </label>
              )}
            </div>
          </section>

          <hr className="border-brand-border md:hidden" />

          {/* Notes */}
          <section>
            <SectionLabel icon={FileText}>Notes <span className="font-normal text-gray-400">(optional)</span></SectionLabel>
            <Textarea
              label="Internal notes"
              placeholder="Crew reminders, equipment needed..."
              rows={2}
              {...register("internalNotes")}
            />
          </section>
        </div>

        {/* Desktop actions */}
        <div
          className={
            inModal
              ? "hidden md:flex gap-3 pt-6 border-t border-brand-border"
              : "hidden md:flex gap-3 px-8 py-5 border-t border-brand-border bg-brand-gray/30"
          }
        >
          <Button type="submit" size="lg" disabled={submitting || !!scheduleConflict}>
            {submitting ? "Saving..." : job ? "Save Changes" : "Create Job"}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Mobile sticky actions */}
      <div
        className={
          inModal
            ? "flex md:hidden gap-2 sticky bottom-0 bg-white border-t border-brand-border pt-4 mt-6 -mx-1 px-1"
            : "fixed bottom-0 inset-x-0 z-30 md:hidden px-4 safe-area-bottom"
        }
      >
        <div
          className={
            inModal
              ? "flex w-full gap-2"
              : "flex gap-2 rounded-2xl bg-white border border-brand-border shadow-lg p-2 w-full"
          }
        >
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-[2]"
            disabled={submitting || !!scheduleConflict}
          >
            {submitting ? "Saving..." : job ? "Save" : "Create Job"}
          </Button>
        </div>
      </div>
    </form>
  );
}
