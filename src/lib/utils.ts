import { format } from "date-fns";
import type { Customer, Job } from "@/types";
import { formatJobDate, getJobDateOnly, jobDateTimeStrings } from "@/lib/dates";

export function formatCurrency(amount?: number): string {
  if (amount === undefined || amount === null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return formatJobDate(date);
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function getCustomerName(job: Job): string {
  if (typeof job.customer === "object" && job.customer !== null) {
    return job.customer.name;
  }
  return "Unknown Customer";
}

export function getJobAddress(job: Job): string {
  if (typeof job.customer === "object" && job.customer !== null) {
    const c = job.customer;
    const parts = [c.streetAddress, c.city, c.state].filter(Boolean);
    return parts.join(", ");
  }
  return "";
}

export function getCustomerAddress(customer: Customer): string {
  const parts = [
    customer.streetAddress,
    customer.city,
    customer.state,
    customer.zipCode,
  ].filter(Boolean);
  return parts.join(", ") || "No address on file";
}

export function getJobDuration(startTime: string, endTime: string): string {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export function jobToCalendarEvent(job: Job) {
  const { start, end } = jobDateTimeStrings(job.jobDate, job.startTime, job.endTime);

  return {
    id: job._id,
    title: getCustomerName(job),
    start,
    end,
    extendedProps: { job },
  };
}
