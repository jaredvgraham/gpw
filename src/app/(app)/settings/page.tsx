"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { serviceSchema } from "@/lib/validations";
import type { z } from "zod";
import type { Service } from "@/types";
import { formatCurrency } from "@/lib/utils";

export default function SettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", description: "", basePrice: undefined, active: true },
  });

  async function fetchServices() {
    setLoading(true);
    const res = await fetch("/api/services");
    setServices(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchServices();
  }, []);

  async function onSubmit(data: z.infer<typeof serviceSchema>) {
    const url = editingId ? `/api/services/${editingId}` : "/api/services";
    const method = editingId ? "PATCH" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    reset();
    setEditingId(null);
    setShowForm(false);
    fetchServices();
  }

  function startEdit(service: Service) {
    setEditingId(service._id);
    setShowForm(true);
    reset({
      name: service.name,
      description: service.description ?? "",
      basePrice: service.basePrice,
      active: service.active,
    });
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service?")) return;
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    fetchServices();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Service Settings"
        description="Manage your service types and base pricing"
        action={
          <Button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
              reset({ name: "", description: "", basePrice: undefined, active: true });
            }}
          >
            + Add Service
          </Button>
        }
      />

      {showForm && (
        <Card title={editingId ? "Edit Service" : "Add Service"} className="mb-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Service Name" required {...register("name")} error={errors.name?.message} />
              <Input label="Base Price" type="number" min="0" step="0.01" {...register("basePrice")} error={errors.basePrice?.message} />
              <Textarea label="Description" className="sm:col-span-2" {...register("description")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("active")} className="rounded" />
              Active
            </label>
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Update" : "Create"}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((service) => (
          <Card key={service._id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-brand-black">{service.name}</h3>
                {service.description && (
                  <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                )}
                {service.basePrice !== undefined && (
                  <p className="text-sm font-medium text-brand-blue mt-2">
                    Base: {formatCurrency(service.basePrice)}
                  </p>
                )}
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  service.active
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {service.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" variant="secondary" onClick={() => startEdit(service)}>
                Edit
              </Button>
              {service.name !== "Other" && (
                <Button size="sm" variant="danger" onClick={() => deleteService(service._id)}>
                  Delete
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
