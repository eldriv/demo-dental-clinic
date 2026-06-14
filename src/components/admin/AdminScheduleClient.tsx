"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { ScheduleBlock } from "@/lib/schedule-block-utils";
import { useAdminDentists } from "@/components/admin/useAdminDentists";

interface AdminScheduleClientProps {
  initialBlocks: ScheduleBlock[];
}

export function AdminScheduleClient({ initialBlocks }: AdminScheduleClientProps) {
  const { dentists, loading: dentistsLoading } = useAdminDentists();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/schedule-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          endDate: endDate || undefined,
          reason: reason || undefined,
          providerId: selectedProvider || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save block.");
        return;
      }
      setBlocks((current) => [...current, data.block]);
      setDate("");
      setEndDate("");
      setReason("");
      setSelectedProvider("");
    } catch {
      setError("Failed to save block.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/schedule-blocks?id=${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setBlocks((current) => current.filter((block) => block.id !== id));
  }

  function dentistName(id: string) {
    return dentists.find((dentist) => dentist.id === id)?.name ?? id;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Block Schedule"
        description="Block clinic closures or mark dentist leave. Whole-clinic blocks stop online booking."
      />

      <form onSubmit={handleSubmit} className="admin-card space-y-4">
        <h2 className="font-semibold text-dark">Add blocked dates</h2>

        <div>
          <label htmlFor="provider" className="mb-1.5 block text-sm font-medium text-gray-700">
            Applies to
          </label>
          <select
            id="provider"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="input-field"
            disabled={dentistsLoading}
          >
            <option value="">Whole clinic (no online booking)</option>
            {dentists.map((dentist) => (
              <option key={dentist.id} value={dentist.id}>
                {dentist.name} — on leave (shown on dashboard)
              </option>
            ))}
          </select>
          {dentists.length === 0 && !dentistsLoading && (
            <p className="mt-1 text-xs text-muted">
              <a href="/admin/dentists" className="text-primary underline">
                Add dentists
              </a>{" "}
              to mark individual leave.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-gray-700">
              Start date
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="mb-1.5 block text-sm font-medium text-gray-700">
              End date (optional)
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              min={date || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reason" className="mb-1.5 block text-sm font-medium text-gray-700">
            Reason (optional)
          </label>
          <input
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field"
            placeholder="Holiday, vacation, conference"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-cta">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Save block"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold text-dark">Blocked dates</h2>
        {blocks.length === 0 ? (
          <AdminEmptyState message="No blocked dates yet." />
        ) : (
          <div className="grid gap-3">
            {blocks.map((block) => (
              <div key={block.id} className="admin-card flex items-start justify-between gap-3 p-4!">
                <div>
                  <p className="font-medium text-dark">
                    {block.date}
                    {block.endDate ? ` → ${block.endDate}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {block.providerId
                      ? `${dentistName(block.providerId)} — on leave`
                      : "Whole clinic — online booking closed"}
                    {block.reason ? ` · ${block.reason}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(block.id)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label="Delete block"
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
