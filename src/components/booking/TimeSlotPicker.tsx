"use client";

import type { TimeSlotOption } from "@/lib/booking-availability";

interface TimeSlotPickerProps {
  id: string;
  name: string;
  slots: TimeSlotOption[];
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  layout?: "list" | "grid";
}

export function TimeSlotPicker({
  id,
  name,
  slots,
  value,
  onChange,
  disabled = false,
  loading = false,
  placeholder = "Select a time",
  layout = "list",
}: TimeSlotPickerProps) {
  const hasAvailable = slots.some((slot) => slot.available);
  const isGrid = layout === "grid";

  return (
    <div>
      <input type="hidden" id={id} name={name} value={value} required={hasAvailable && !disabled} />
      {loading || slots.length === 0 || disabled ? (
        <p
          className={`text-sm text-muted ${
            isGrid ? "rounded-xl border border-dashed border-gray-200 bg-surface/50 px-4 py-6 text-center" : "px-3 py-2"
          }`}
        >
          {placeholder}
        </p>
      ) : isGrid ? (
        <div
          className={`flex flex-wrap gap-2 ${disabled || loading ? "pointer-events-none opacity-60" : ""}`}
          role="listbox"
          aria-label="Available appointment times"
        >
          {slots.map((slot) => {
            const selected = value === slot.time;
            return (
              <button
                key={slot.time}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={!slot.available}
                disabled={!slot.available}
                onClick={() => onChange(slot.time)}
                className={`min-w-[5.5rem] rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-primary bg-primary text-white shadow-sm"
                    : slot.available
                      ? "border-gray-200 bg-white text-dark hover:border-primary/40 hover:bg-primary/5"
                      : "cursor-not-allowed border-gray-100 bg-gray-50 text-muted"
                }`}
              >
                <span className={slot.available ? "" : "line-through decoration-muted/80"}>
                  {slot.time}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className={`max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-sm ring-1 ring-gray-100 ${
            disabled || loading ? "pointer-events-none opacity-60" : ""
          }`}
          role="listbox"
          aria-label="Available appointment times"
        >
          {slots.map((slot) => {
            const selected = value === slot.time;
            return (
              <button
                key={slot.time}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={!slot.available}
                disabled={!slot.available}
                onClick={() => onChange(slot.time)}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  selected
                    ? "bg-primary font-semibold text-white"
                    : slot.available
                      ? "text-dark hover:bg-surface"
                      : "cursor-not-allowed text-muted"
                }`}
              >
                <span className={slot.available ? "" : "line-through decoration-muted/80"}>
                  {slot.time}
                </span>
                {!slot.available && (
                  <span className="ml-2 text-xs font-normal opacity-70">Unavailable</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
