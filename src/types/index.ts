import type { JobStatus } from "@/lib/constants";
import type { ExpensePayer, ExpenseType } from "@/lib/expenses";

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  household?: string | Household;
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  _id: string;
  streetAddress: string;
  city: string;
  state?: string;
  zipCode?: string;
  addressKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  _id: string;
  name: string;
  description?: string;
  basePrice?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobService {
  service?: string | Service;
  name: string;
  customServiceName?: string;
  notes?: string;
}

export interface Job {
  _id: string;
  customer: string | Customer;
  jobDate: string;
  startTime: string;
  endTime: string;
  status: JobStatus;
  services: JobService[];
  finalPrice?: number;
  paid?: boolean;
  internalNotes?: string;
  photoNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = "new" | "contacted" | "converted" | "lost";
export type LeadSource = "website" | "meta_ad" | "phone" | "other";

export interface Lead {
  _id: string;
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
  customer?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  _id: string;
  type: ExpenseType;
  amount: number;
  paidBy?: ExpensePayer;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todayJobs: Job[];
  tomorrowJobs: Job[];
  upcomingJobs: Job[];
  completedThisMonth: number;
  estimatedRevenueWeek: number;
  estimatedRevenueMonth: number;
}

export type { BusinessInsights, RevenuePoint, WeekInsights, MonthInsights, YearInsights } from "@/lib/dashboard-stats";
