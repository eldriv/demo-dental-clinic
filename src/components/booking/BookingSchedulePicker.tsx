"use client";

import { CalendarDays, Clock } from "lucide-react";
import { BookingCalendarPicker } from "@/components/booking/BookingCalendarPicker";
import { TimeSlotPicker } from "@/components/booking/TimeSlotPicker";
import type { TimeSlotOption } from "@/lib/booking-availability";

interface BookingSchedulePickerProps {
  dateId: string;
  timeId: string;
  dateName?: string;
  timeName?: string;
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  dentistId: string;
  excludeToken?: string;
  timeSlots: TimeSlotOption[];
  slotsLoading?: boolean;
  dateClosed?: boolean;
  cannotBookDate?: boolean;
}

function formatSelectedDate(dateString: string): string {
  return new Date(`${dateString}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function BookingSchedulePicker({
  dateId,
  timeId,
  dateName = "date",
  timeName = "time",
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  dentistId,
  excludeToken,
  timeSlots,
  slotsLoading = false,
  dateClosed = false,
  cannotBookDate = false,
}: BookingSchedulePickerProps) {
  const hasAvailableSlot = timeSlots.some((slot) => slot.available);
  const timesDisabled = !selectedDate || dateClosed || cannotBookDate;

  const timePlaceholder = !selectedDate
    ? "Choose a date above to see available times"
    : slotsLoading
      ? "Loading times…"
      : dateClosed
        ? "The clinic is closed on this day"
        : !hasAvailableSlot && timeSlots.length > 0
          ? "All times are booked on this day"
          : timeSlots.length === 0
            ? "No times available"
            : "Select a time";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface/40 ring-1 ring-gray-100">
      <div className="flex items-center gap-2 border-b border-gray-200/80 bg-white px-4 py-3">
        <CalendarDays className="size-4 text-primary" aria-hidden />
        <span className="text-sm font-semibold text-dark">Preferred date &amp; time</span>
        <span className="text-red-500">*</span>
      </div>

      <div className="bg-white px-3 py-2.5 sm:px-4">
        <BookingCalendarPicker
          id={dateId}
          name={dateName}
          value={selectedDate}
          onChange={(date) => {
            onDateChange(date);
            onTimeChange("");
          }}
          dentistId={dentistId}
          excludeToken={excludeToken}
          embedded
        />
        {selectedDate && dateClosed && (
          <p className="mt-3 text-xs text-red-600">
            The clinic is closed on this day. Please choose another date.
          </p>
        )}
      </div>

      <div className="border-t border-gray-200/80 bg-white px-3 py-3 sm:px-4 sm:py-4">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="size-4 text-primary" aria-hidden />
          <p className="text-sm font-medium text-dark">
            {selectedDate ? formatSelectedDate(selectedDate) : "Available times"}
          </p>
        </div>

        <TimeSlotPicker
          id={timeId}
          name={timeName}
          slots={timeSlots}
          value={selectedTime}
          onChange={onTimeChange}
          disabled={timesDisabled}
          loading={slotsLoading}
          layout="grid"
          placeholder={timePlaceholder}
        />
      </div>
    </div>
  );
}
