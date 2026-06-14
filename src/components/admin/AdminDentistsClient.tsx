"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { ClinicDentist } from "@/lib/dentists";

interface AdminDentistsClientProps {
  initialDentists: ClinicDentist[];
}

export function AdminDentistsClient({ initialDentists }: AdminDentistsClientProps) {
  const [dentists, setDentists] = useState(initialDentists);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/dentists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add dentist.");
        return;
      }

      setDentists((current) => [...current, data.dentist]);
      setName("");
      setMessage(`${data.dentist.name} added. They can now be assigned on approve and marked on leave.`);
    } catch {
      setError("Failed to add dentist.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    setMessage("");

    const res = await fetch(`/api/admin/dentists?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to remove dentist.");
      return;
    }

    setDentists((current) => current.filter((dentist) => dentist.id !== id));
    setMessage("Dentist removed.");
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dentists"
        description="Add dentists for appointment assignment and leave tracking."
      />

      <form onSubmit={handleSubmit} className="admin-card space-y-4">
        <h2 className="font-semibold text-dark">Add dentist</h2>
        <div>
          <label htmlFor="dentist-name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="dentist-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Dr. Juan Reyes"
            required
            minLength={2}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}

        <button type="submit" disabled={loading} className="btn-cta">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Add dentist
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold text-dark">Current dentists ({dentists.length})</h2>
        {dentists.length === 0 ? (
          <AdminEmptyState message="No dentists yet. Add your clinic dentists above." />
        ) : (
          <div className="grid gap-3">
            {dentists.map((dentist) => (
              <div key={dentist.id} className="admin-card flex items-center justify-between gap-3 p-4!">
                <div>
                  <p className="font-medium text-dark">{dentist.name}</p>
                  <p className="text-xs text-muted">ID: {dentist.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(dentist.id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label={`Remove ${dentist.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
