"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Lead, LeadStatus } from "@/types";
import { Mail, MapPin, Phone, Megaphone } from "lucide-react";

const STATUS_OPTIONS: { value: "" | LeadStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  contacted: "bg-amber-50 text-amber-700 border-amber-200",
  converted: "bg-green-50 text-green-700 border-green-200",
  lost: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | LeadStatus>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);

    try {
      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load leads");
      setLeads(await res.json());
    } catch (error) {
      console.error(error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = setTimeout(fetchLeads, 250);
    return () => clearTimeout(timeout);
  }, [fetchLeads]);

  async function updateStatus(id: string, next: LeadStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = (await res.json()) as Lead;
      setLeads((prev) =>
        prev.map((lead) => (lead._id === id ? { ...lead, ...updated } : lead)),
      );
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads"
        description={`${leads.length} website / ad lead${leads.length !== 1 ? "s" : ""}`}
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-[1fr_14rem]">
        <Input
          label="Search"
          placeholder="Name, phone, town..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | LeadStatus)}
            className="w-full rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-gray-900"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : leads.length === 0 ? (
        <div className="rounded-xl bg-white border border-brand-border p-12 text-center">
          <p className="text-gray-500">No leads found.</p>
        </div>
      ) : (
        <>
        <div className="hidden h-[calc(100dvh-11rem)] min-h-[32rem] overflow-hidden rounded-xl border border-brand-border bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-h-0 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-brand-border bg-brand-gray text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {leads.map((lead) => {
                const active = (selectedId ?? leads[0]?._id) === lead._id;
                return (
                <tr
                  key={lead._id}
                  onClick={() => setSelectedId(lead._id)}
                  className={`cursor-pointer ${active ? "bg-blue-50" : "hover:bg-brand-gray/60"}`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-brand-black">{lead.name}</p>
                      {lead.source === "meta_ad" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          <Megaphone className="h-3 w-3" />
                          Meta
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      {lead.town}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">
                    <p className="font-medium">{lead.phone}</p>
                    {lead.email && <p className="truncate text-xs text-gray-500">{lead.email}</p>}
                  </td>
                  <td className="max-w-[14rem] px-4 py-2.5 text-gray-600">
                    <p className="truncate">{lead.services?.length ? lead.services.join(", ") : "—"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : ""}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[lead.status]}`}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <LeadDetail
            lead={leads.find((lead) => lead._id === (selectedId ?? leads[0]?._id)) ?? null}
            updating={updatingId === (selectedId ?? leads[0]?._id)}
            onStatus={(status) => {
              const id = selectedId ?? leads[0]?._id;
              if (id) void updateStatus(id, status);
            }}
          />
        </div>
        <div className="space-y-3 lg:hidden">
          {leads.map((lead) => (
            <article
              key={lead._id}
              className="rounded-xl border border-brand-border bg-white p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-brand-black">
                      {lead.name}
                    </h2>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[lead.status]}`}
                    >
                      {lead.status}
                    </span>
                    {lead.source === "meta_ad" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                        <Megaphone className="h-3 w-3" />
                        Meta ad
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {lead.town}
                    </span>
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 font-medium text-brand-blue hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone}
                    </a>
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {lead.email}
                      </a>
                    )}
                  </div>
                </div>
                <label className="block sm:w-40">
                  <span className="sr-only">Update status</span>
                  <select
                    value={lead.status}
                    disabled={updatingId === lead._id}
                    onChange={(e) =>
                      updateStatus(lead._id, e.target.value as LeadStatus)
                    }
                    className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.filter((o) => o.value).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Services
                </p>
                {lead.services?.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {lead.services.map((service) => (
                      <span
                        key={service}
                        className="rounded-full border border-brand-border bg-brand-gray px-2.5 py-0.5 text-xs font-medium text-gray-800"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-400">None listed</p>
                )}
              </div>
              {lead.howYouFoundUs && (
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-gray-500">Found us: </span>
                  {lead.howYouFoundUs}
                </p>
              )}
              {lead.message && (
                <p className="mt-2 rounded-lg bg-brand-gray px-3 py-2 text-sm text-gray-700">
                  {lead.message}
                </p>
              )}
              <p className="mt-3 text-xs text-gray-400">
                {lead.createdAt
                  ? new Date(lead.createdAt).toLocaleString()
                  : ""}
              </p>
            </article>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

function LeadDetail({
  lead,
  updating,
  onStatus,
}: {
  lead: Lead | null;
  updating: boolean;
  onStatus: (status: LeadStatus) => void;
}) {
  if (!lead) return null;

  return (
    <aside className="flex min-h-0 flex-col overflow-auto border-l border-brand-border bg-brand-gray/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-black">{lead.name}</h2>
          <p className="mt-1 text-sm text-gray-500">{lead.town}</p>
        </div>
        {lead.source === "meta_ad" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            <Megaphone className="h-3 w-3" />
            Meta
          </span>
        )}
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          Status
        </span>
        <select
          value={lead.status}
          disabled={updating}
          onChange={(e) => onStatus(e.target.value as LeadStatus)}
          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 space-y-2 text-sm">
        <a href={`tel:${lead.phone}`} className="flex items-center gap-2 font-medium text-brand-blue hover:underline">
          <Phone className="h-4 w-4" />
          {lead.phone}
        </a>
        {lead.email && (
          <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-gray-700 hover:underline">
            <Mail className="h-4 w-4 text-gray-400" />
            {lead.email}
          </a>
        )}
        <p className="flex items-center gap-2 text-gray-600">
          <MapPin className="h-4 w-4 text-gray-400" />
          {lead.town}
        </p>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Services</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {lead.services?.length ? (
            lead.services.map((service) => (
              <span
                key={service}
                className="rounded-full border border-brand-border bg-white px-2.5 py-0.5 text-xs font-medium text-gray-800"
              >
                {service}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400">None listed</span>
          )}
        </div>
      </div>

      {lead.howYouFoundUs && (
        <p className="mt-4 text-sm text-gray-600">
          <span className="font-medium text-gray-500">Found us: </span>
          {lead.howYouFoundUs}
        </p>
      )}

      {lead.message && (
        <p className="mt-4 rounded-xl bg-white px-3 py-3 text-sm leading-relaxed text-gray-700">
          {lead.message}
        </p>
      )}

      <p className="mt-auto pt-4 text-xs text-gray-400">
        {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : ""}
      </p>
    </aside>
  );
}
