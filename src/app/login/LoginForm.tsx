"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Droplets } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: password.trim() }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Login is unavailable. Restart the dev server and try again.");
        }

        const contentType = res.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? await res.json().catch(() => ({}))
          : {};
        throw new Error(
          typeof data.error === "string" ? data.error : "Incorrect password"
        );
      }

      const from = searchParams.get("from");
      router.replace(from && from.startsWith("/") && from !== "/login" ? from : "/calendar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-brand-gray px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue text-white">
            <Droplets className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold text-brand-black">Graham Power Washing</h1>
          <p className="mt-1 text-sm text-gray-500">Enter the app password to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="App password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
          />

          {error && (
            <p className="text-sm text-brand-red" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
