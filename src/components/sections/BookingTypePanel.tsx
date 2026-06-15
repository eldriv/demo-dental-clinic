"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Phone, UserRound, UsersRound } from "lucide-react";
import { site } from "@/content";
import { GROUP_BOOKING_PHONE_NOTICE } from "@/lib/booking-group";

const BookingForm = dynamic(
  () => import("@/components/booking/BookingForm").then((mod) => mod.BookingForm),
  { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-xl bg-gray-100" /> }
);

type BookingTab = "solo" | "group";

function GroupBookingPanel() {
  const phone = site.contact.phones[0];
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <div className="booking-group-panel">
      <div className="flex gap-4">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15"
          aria-hidden
        >
          <UsersRound className="size-6" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-dark">Group appointments</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{GROUP_BOOKING_PHONE_NOTICE}</p>
          <p className="mt-3 text-sm text-muted">
            Our team will block the right amount of chair time and confirm everyone&apos;s services
            over the phone.
          </p>
          <a href={phoneHref} className="btn-cta mt-6 inline-flex">
            <Phone className="size-4" aria-hidden />
            Call {phone}
          </a>
          {site.contact.phones[1] && (
            <p className="mt-3 text-xs text-muted">Or call {site.contact.phones[1]}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookingTypePanel() {
  const [tab, setTab] = useState<BookingTab>("solo");

  return (
    <div className="booking-type-panel rounded-2xl bg-white p-6 shadow-xl md:p-8">
      <div className="booking-panel-tablist" role="tablist" aria-label="Appointment type">
        <button
          type="button"
          role="tab"
          id="booking-tab-solo"
          aria-selected={tab === "solo"}
          aria-controls="booking-tabpanel-solo"
          className={`booking-panel-tab ${tab === "solo" ? "booking-panel-tab-active" : ""}`}
          onClick={() => setTab("solo")}
        >
          <UserRound className="size-4 shrink-0" aria-hidden />
          Solo appointment
        </button>
        <button
          type="button"
          role="tab"
          id="booking-tab-group"
          aria-selected={tab === "group"}
          aria-controls="booking-tabpanel-group"
          className={`booking-panel-tab ${tab === "group" ? "booking-panel-tab-active" : ""}`}
          onClick={() => setTab("group")}
        >
          <UsersRound className="size-4 shrink-0" aria-hidden />
          Group appointment
        </button>
      </div>

      <div className="booking-panel-body">
        {tab === "solo" ? (
          <div
            role="tabpanel"
            id="booking-tabpanel-solo"
            aria-labelledby="booking-tab-solo"
          >
            <BookingForm />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="booking-tabpanel-group"
            aria-labelledby="booking-tab-group"
          >
            <GroupBookingPanel />
          </div>
        )}
      </div>
    </div>
  );
}
