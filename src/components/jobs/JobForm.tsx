"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import type { Job, Service, Customer } from "@/types";
import { getJobDuration } from "@/lib/utils";
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
  const [services, setServices] = useState<Service[]>([]);
  const [dayJobs, setDayJobs] = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [scheduleConflict, setScheduleConflict] = useState<string | null>(null);

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
      photoNotes: job?.photoNotes ?? "",
    },
  });

  const { append, remove } = useFieldArray({ control, name: "services" });
  const jobDate = watch("jobDate");
  const startTime = watch("startTime");
  const endTime = watch("endTime");
  const selectedServices = watch("services");
  const isPaid = watch("paid");

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices);
  }, []);

  useEffect(() => {
    if (!jobDate) {
      setDayJobs([]);
      return;
    }

    fetch(`/api/jobs?startDate=${jobDate}&endDate=${jobDate}`)
      .then((r) => r.json())
      .then((data) => setDayJobs(Array.isArray(data) ? data : []))
      .catch(() => setDayJobs([]));
  }, [jobDate]);

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
              ? "space-y-8"
              : "px-5 py-6 md:px-8 md:py-8 space-y-8"
          }
        >
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-brand-red">
              {error}
            </div>
          )}

          {/* When */}
          <section>
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
              <div className="flex-1 min-w-[140px] max-w-xs">
                <Select
                  label="Status"
                  options={JOB_STATUSES.map((s) => ({ value: s, label: s }))}
                  value={watch("status")}
                  onChange={(e) => setValue("status", e.target.value as JobStatus)}
                />
              </div>
            </div>
          </section>

          <hr className="border-brand-border" />

          {/* Who */}
          <section>
            <SectionLabel icon={User}>Customer</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Name"
                required
                placeholder="John Smith"
                {...register("customer.name")}
                error={errors.customer?.name?.message}
              />
              <Input
                label="Phone"
                required
                type="tel"
                placeholder="(555) 123-4567"
                {...register("customer.phone")}
                error={errors.customer?.phone?.message}
              />
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

          <hr className="border-brand-border" />

          {/* Where */}
          <section>
            <SectionLabel icon={MapPin}>Job location</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Street address"
                placeholder="123 Main St"
                className="sm:col-span-2"
                {...register("customer.streetAddress")}
              />
              <Input
                label="Town / city"
                placeholder="Springfield"
                {...register("customer.city")}
              />
            </div>
          </section>

          <hr className="border-brand-border" />

          {/* Services */}
          <section>
            <SectionLabel icon={Wrench}>Services</SectionLabel>
            <p className="text-sm text-gray-500 -mt-2 mb-3">Tap to select one or more.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {services.map((service) => {
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
                    {...register(`services.${index}.customServiceName`)}
                    placeholder="Describe the service"
                  />
                </div>
              ) : null
            )}
          </section>

          <hr className="border-brand-border" />

          {/* Pricing */}
          <section>
            <SectionLabel icon={DollarSign}>Pricing</SectionLabel>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                <Input
                  label="Final price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("finalPrice")}
                  error={errors.finalPrice?.message}
                />
              </div>
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
            </div>
          </section>

          <hr className="border-brand-border" />

          {/* Notes */}
          <section>
            <SectionLabel icon={FileText}>Notes <span className="font-normal text-gray-400">(optional)</span></SectionLabel>
            <div className="space-y-3">
              <Textarea
                label="Internal notes"
                placeholder="Crew reminders, equipment needed..."
                rows={2}
                {...register("internalNotes")}
              />
              <Textarea
                label="Photo notes"
                placeholder="Before/after photo reminders..."
                rows={2}
                {...register("photoNotes")}
              />
            </div>
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
