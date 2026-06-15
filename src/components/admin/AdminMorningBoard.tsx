import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, UserCheck } from "lucide-react";
import type { Booking } from "@/lib/bookings";
import { formatBookingCalendarLabel } from "@/lib/booking-group";
import { needsNoShowAlert } from "@/lib/appointment-attendance";
import { getBookingSource } from "@/lib/bookings";
import { StatusBadge, formatBookingWhen } from "@/components/admin/StatusBadge";

interface AdminMorningBoardProps {
  bookings: Booking[];
}

function getArrivalStatus(booking: Booking): "checked-in" | "late" | "alert" | "upcoming" {
  if (booking.checkedInAt) return "checked-in";
  if (booking.lateNoticeAt) return "late";
  if (needsNoShowAlert(booking)) return "alert";
  return "upcoming";
}

const statusStyles = {
  "checked-in": "border-green-200 bg-green-50 text-green-800",
  late: "border-blue-200 bg-blue-50 text-blue-800",
  alert: "border-amber-200 bg-amber-50 text-amber-900",
  upcoming: "border-slate-200 bg-white text-slate-700",
};

export function AdminMorningBoard({ bookings }: AdminMorningBoardProps) {
  const active = bookings.filter(
    (booking) =>
      booking.status !== "cancelled" &&
      booking.status !== "declined" &&
      booking.status !== "completed"
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="admin-dash-panel-title">Today&apos;s board</h2>
        <Link href="/admin/appointments?filter=today" className="admin-dash-panel-more text-xs">
          View all
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="admin-dash-panel-card admin-dash-panel-card-empty py-10">
          <p className="text-center text-sm text-muted">No active appointments for today.</p>
        </div>
      ) : (
        <ol className="space-y-2">
          {active.map((booking) => {
            const arrival = getArrivalStatus(booking);
            return (
              <li
                key={booking.token}
                className={`rounded-2xl border px-4 py-3 ${statusStyles[arrival]}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 shrink-0 opacity-70" />
                      <span className="text-sm font-semibold">{booking.time}</span>
                      <StatusBadge booking={booking} compact />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{formatBookingCalendarLabel(booking)}</p>
                    <p className="truncate text-xs opacity-80">
                      {booking.service}
                      {booking.assignedDentistName ? ` · ${booking.assignedDentistName}` : ""}
                      {getBookingSource(booking) === "staff" ? " · Walk-in/phone" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                    {arrival === "checked-in" && (
                      <>
                        <UserCheck className="size-3.5" />
                        Checked in
                      </>
                    )}
                    {arrival === "late" && (
                      <>
                        <Clock className="size-3.5" />
                        Running late
                      </>
                    )}
                    {arrival === "alert" && (
                      <>
                        <AlertTriangle className="size-3.5" />
                        Follow up
                      </>
                    )}
                    {arrival === "upcoming" && (
                      <>
                        <CheckCircle2 className="size-3.5 opacity-50" />
                        Expected
                      </>
                    )}
                  </div>
                </div>
                {booking.internalNotes && (
                  <p className="mt-2 rounded-lg bg-black/5 px-2 py-1 text-xs">
                    Note: {booking.internalNotes}
                  </p>
                )}
                <p className="mt-2 text-[11px] opacity-70">{formatBookingWhen(booking)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
