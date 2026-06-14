"use client";

import { useMemo, useState } from "react";
import type { Booking } from "@/lib/bookings";
import { AppointmentCard } from "@/components/admin/AppointmentCard";
import { needsStaffApproval } from "@/lib/booking-status";
import {
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/AdminPageHeader";

interface AdminAppointmentsClientProps {
  initialBookings: Booking[];
  compact?: boolean;
}

export function AdminAppointmentsClient({
  initialBookings,
  compact = false,
}: AdminAppointmentsClientProps) {
  const [bookings, setBookings] = useState(initialBookings);

  function handleUpdated(updated: Booking) {
    setBookings((current) =>
      current.map((booking) => (booking.token === updated.token ? updated : booking))
    );
  }

  if (bookings.length === 0) {
    return <AdminEmptyState message="No appointments to show." />;
  }

  return (
    <div className="grid gap-4">
      {bookings.map((booking) => (
        <AppointmentCard key={booking.token} booking={booking} onUpdated={handleUpdated} />
      ))}
    </div>
  );
}

interface AdminAppointmentsPageClientProps {
  initialBookings: Booking[];
  initialFilter: "today" | "pending" | "all";
}

export function AdminAppointmentsPageClient({
  initialBookings,
  initialFilter,
}: AdminAppointmentsPageClientProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState(initialFilter);

  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const filtered = useMemo(() => {
    if (filter === "pending") {
      return bookings.filter((booking) => needsStaffApproval(booking));
    }
    if (filter === "today") {
      return bookings.filter(
        (booking) =>
          booking.date === today &&
          booking.status !== "cancelled" &&
          booking.status !== "declined"
      );
    }
    return bookings;
  }, [bookings, filter, today]);

  function handleUpdated(updated: Booking) {
    setBookings((current) =>
      current.map((booking) => (booking.token === updated.token ? updated : booking))
    );
  }

  const tabs = [
    { id: "today" as const, label: "Today" },
    { id: "pending" as const, label: "Needs approval" },
    { id: "all" as const, label: "All" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Appointments"
        description="Review requests, assign dentists, and manage patient visits."
      />

      <div className="admin-segment">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`admin-segment-btn ${
              filter === tab.id ? "admin-segment-btn-active" : "hover:text-dark"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState message="No appointments in this view." />
      ) : (
        <div className="grid gap-4">
          {filtered.map((booking) => (
            <AppointmentCard key={booking.token} booking={booking} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
