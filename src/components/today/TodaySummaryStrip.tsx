"use client";

import Link from "next/link";
import { Briefcase, DollarSign } from "lucide-react";
import { formatCompactCurrency } from "@/lib/calendar-mobile";
import type { Job } from "@/types";

interface TodaySummaryStripProps {
  jobs: Job[];
  loading?: boolean;
}

export default function TodaySummaryStrip({ jobs, loading }: TodaySummaryStripProps) {
  const revenue = jobs.reduce((sum, job) => sum + (job.finalPrice ?? 0), 0);

  const cards = [
    {
      icon: Briefcase,
      iconWrap: "bg-blue-100",
      iconColor: "text-blue-600",
      primary: loading ? "—" : String(jobs.length),
      secondary: jobs.length === 1 ? "Job Today" : "Jobs Today",
      link: { href: "/jobs", text: "View all" },
    },
    {
      icon: DollarSign,
      iconWrap: "bg-green-100",
      iconColor: "text-green-600",
      primary: loading ? "—" : formatCompactCurrency(revenue),
      secondary: "Est. Revenue",
      link: { href: "/dashboard", text: "View details" },
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((card) => (
        <div
          key={card.secondary}
          className="flex flex-col rounded-xl border border-gray-100 bg-white px-3 py-3 shadow-sm"
        >
          <div
            className={`mb-2.5 flex h-9 w-9 items-center justify-center rounded-full ${card.iconWrap}`}
          >
            <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} strokeWidth={2} />
          </div>
          <p className="text-lg font-bold leading-none text-gray-900">{card.primary}</p>
          <p className="mt-1 text-[10.5px] leading-snug text-gray-600">{card.secondary}</p>
          <Link
            href={card.link.href}
            className="mt-1.5 text-[10.5px] font-medium leading-snug text-brand-blue"
          >
            {card.link.text}
          </Link>
        </div>
      ))}
    </div>
  );
}
