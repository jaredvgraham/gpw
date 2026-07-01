"use client";

import Link from "next/link";
import { useState } from "react";
import { Home, Link2, Unlink, Users } from "lucide-react";
import type { Customer, Household } from "@/types";
import { getCustomerAddress } from "@/lib/utils";

export default function HouseholdPanel({
  customerId,
  household,
  members,
  suggestions,
  onUpdated,
}: {
  customerId: string;
  household: Household | null;
  members: Customer[];
  suggestions: Customer[];
  onUpdated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasHousehold = Boolean(household && members.length > 0);
  const address = household
    ? [household.streetAddress, household.city, household.state].filter(Boolean).join(", ")
    : "";

  async function runAction(body: Record<string, string>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customerId}/household`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-brand-blue" />
            <h2 className="text-base font-semibold text-brand-black">Household</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Link people at the same address to see all jobs at that property.
          </p>
        </div>
        {hasHousehold && (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
            <Users className="h-3.5 w-3.5" />
            {members.length + 1} people
          </span>
        )}
      </div>

      {hasHousehold ? (
        <div className="mb-4 rounded-xl bg-brand-gray/40 px-4 py-3 text-sm text-gray-700">
          <p className="font-medium text-brand-black">{address}</p>
          <p className="mt-1 text-gray-500">
            Jobs from everyone below show up in household history.
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-gray-500">
          No household linked yet. Combine spouses or roommates who book separately at the same
          address.
        </p>
      )}

      {hasHousehold && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Linked people
          </p>
          {members.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between gap-3 rounded-xl border border-brand-border px-3 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/customers/${member._id}`}
                  className="text-sm font-semibold text-brand-blue hover:underline"
                >
                  {member.name}
                </Link>
                <p className="text-xs text-gray-500">{member.phone}</p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  fetch(`/api/customers/${member._id}/household`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "unlink" }),
                  }).then((res) => {
                    if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error)));
                    onUpdated();
                  }).catch((err) => setError(err instanceof Error ? err.message : "Failed"))
                }
                className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-brand-gray disabled:opacity-50"
              >
                <Unlink className="h-3.5 w-3.5" />
                Unlink
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Same address
          </p>
          {suggestions.map((suggestion) => (
            <div
              key={suggestion._id}
              className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-brand-border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-black">{suggestion.name}</p>
                <p className="text-xs text-gray-500">
                  {suggestion.phone} · {getCustomerAddress(suggestion)}
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  runAction({ action: "link", targetCustomerId: suggestion._id })
                }
                className="inline-flex items-center gap-1 rounded-lg bg-brand-blue px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Link2 className="h-3.5 w-3.5" />
                Link
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-brand-red">{error}</p>}
    </div>
  );
}
