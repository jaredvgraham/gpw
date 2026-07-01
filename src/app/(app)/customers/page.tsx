"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Customer } from "@/types";
import { MapPin, Phone, Mail } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (city) params.set("city", city);

    try {
      const res = await fetch(`/api/customers?${params.toString()}`);
      setCustomers(await res.json());
    } finally {
      setLoading(false);
    }
  }, [search, city]);

  useEffect(() => {
    const timeout = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeout);
  }, [fetchCustomers]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description={`${customers.length} customer${customers.length !== 1 ? "s" : ""}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Input
          label="Search"
          placeholder="Name, phone, address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Input
          label="Town/City"
          placeholder="Filter by city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : customers.length === 0 ? (
        <div className="rounded-xl bg-white border border-brand-border p-12 text-center">
          <p className="text-gray-500">No customers found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Link
              key={customer._id}
              href={`/customers/${customer._id}`}
              className="block rounded-xl bg-white border border-brand-border p-5 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-brand-black">{customer.name}</h3>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </p>
                {customer.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    {customer.email}
                  </p>
                )}
                {(customer.streetAddress || customer.city) && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {[customer.streetAddress, customer.city, customer.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
