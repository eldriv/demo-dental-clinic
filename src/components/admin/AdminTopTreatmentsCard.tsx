"use client";

import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Booking } from "@/lib/bookings";
import { formatMonthYear, getTopTreatmentsBooked } from "@/lib/admin-analytics";

interface AdminTopTreatmentsCardProps {
  bookings: Booking[];
  initialYear: number;
  initialMonth: number;
}

function formatBookingCount(count: number): string {
  return count === 1 ? "1 booking" : `${count} bookings`;
}

export function AdminTopTreatmentsCard({
  bookings,
  initialYear,
  initialMonth,
}: AdminTopTreatmentsCardProps) {
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const rows = useMemo(
    () => getTopTreatmentsBooked(bookings, viewYear, viewMonth),
    [bookings, viewYear, viewMonth]
  );

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div className="admin-analytics-card flex h-full flex-col">
      <h3 className="admin-analytics-card-title">Top treatments booked</h3>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="admin-analytics-month-btn"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium text-slate-600">
          {formatMonthYear(viewYear, viewMonth)}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="admin-analytics-month-btn"
          aria-label="Next month"
        >
          <ChevronLeft className="size-4 rotate-180" />
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 flex flex-1 items-center justify-center text-center text-xs text-muted">
          No appointments booked this month yet.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.name} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-slate-700">
                <span className="mr-2 font-medium text-slate-400">{row.rank}.</span>
                {row.name}
              </span>
              <span className="shrink-0 text-right text-xs font-medium text-slate-600 sm:text-sm">
                {formatBookingCount(row.count)}{" "}
                <span className="text-muted">({row.sharePercent}%)</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
