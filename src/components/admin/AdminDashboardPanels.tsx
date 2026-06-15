import Link from "next/link";
import { Calendar, ClipboardClock, PanelRightOpen } from "lucide-react";
import type { Booking } from "@/lib/bookings";
import { StatusBadge, formatBookingWhen } from "@/components/admin/StatusBadge";
import { formatBookingCalendarLabel, formatBookingServiceLabel } from "@/lib/booking-group";

interface AdminDashboardPanelProps {
  title: string;
  count: number;
  href: string;
  emptyIcon: React.ReactNode;
  emptyMessage: string;
  bookings: Booking[];
}

function DashboardBookingRow({ booking, href }: { booking: Booking; href: string }) {
  const dentistName = booking.assignedDentistName ?? booking.preferredDentistName;

  return (
    <li className="admin-dash-list-divider">
      <Link href={href} className="admin-dash-list-item">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-semibold leading-tight text-dark">
            {formatBookingCalendarLabel(booking)}
          </p>
          <StatusBadge booking={booking} compact />
        </div>
        <p className="mt-0.5 truncate text-xs leading-snug text-muted">{formatBookingServiceLabel(booking)}</p>
        <p className="mt-0.5 truncate text-[11px] leading-snug text-muted/90">
          {formatBookingWhen(booking)}
          {dentistName ? ` · ${dentistName}` : ""}
        </p>
      </Link>
    </li>
  );
}

function AdminDashboardPanel({
  title,
  count,
  href,
  emptyIcon,
  emptyMessage,
  bookings,
}: AdminDashboardPanelProps) {
  const isEmpty = bookings.length === 0;

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="admin-dash-panel-title">
          {title} ({count})
        </h2>
        <Link
          href={href}
          className="admin-dash-panel-more"
          aria-label={`View all ${title.toLowerCase()}`}
        >
          <PanelRightOpen className="size-3.5" />
        </Link>
      </div>

      <div
        className={`admin-dash-panel-card ${isEmpty ? "admin-dash-panel-card-empty" : "admin-dash-panel-card-filled"}`}
      >
        {isEmpty ? (
          <div className="admin-dash-panel-empty">
            <div className="text-slate-300">{emptyIcon}</div>
            <p className="mt-3 max-w-[220px] text-xs leading-relaxed text-muted">{emptyMessage}</p>
          </div>
        ) : (
          <ul>
            {bookings.map((booking) => (
              <DashboardBookingRow key={booking.token} booking={booking} href={href} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

interface AdminDashboardPanelsProps {
  pendingBookings: Booking[];
  todayBookings: Booking[];
  pendingLimit?: number;
  todayLimit?: number;
}

export function AdminDashboardPanels({
  pendingBookings,
  todayBookings,
  pendingLimit = 5,
  todayLimit = 5,
}: AdminDashboardPanelsProps) {
  const pendingPreview = pendingBookings.slice(0, pendingLimit);
  const todayPreview = todayBookings.slice(0, todayLimit);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <AdminDashboardPanel
        title="Pending requests"
        count={pendingBookings.length}
        href="/admin/appointments?filter=pending"
        emptyIcon={<ClipboardClock className="size-14 stroke-[1.25]" />}
        emptyMessage="No pending requests as of the moment."
        bookings={pendingPreview}
      />
      <AdminDashboardPanel
        title="Appointments today"
        count={todayBookings.length}
        href="/admin/appointments?filter=today"
        emptyIcon={<Calendar className="size-14 stroke-[1.25]" />}
        emptyMessage="No scheduled appointment yet."
        bookings={todayPreview}
      />
    </div>
  );
}
