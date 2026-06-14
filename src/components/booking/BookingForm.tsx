"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { booking, services, site } from "@/content";
import { BOOKING_SERVICE_EVENT } from "@/lib/booking-selection";

interface BookingFormProps {
  className?: string;
}

export function BookingForm({ className = "" }: BookingFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [manageUrl, setManageUrl] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [serviceHighlight, setServiceHighlight] = useState(false);

  useEffect(() => {
    const prefill = sessionStorage.getItem("prefillService");
    if (prefill) {
      setSelectedService(prefill);
      sessionStorage.removeItem("prefillService");
      setServiceHighlight(true);
    }

    const onServiceSelected = (event: Event) => {
      const serviceName = (event as CustomEvent<string>).detail;
      setSelectedService(serviceName);
      setServiceHighlight(true);
    };

    window.addEventListener(BOOKING_SERVICE_EVENT, onServiceSelected);
    return () => window.removeEventListener(BOOKING_SERVICE_EVENT, onServiceSelected);
  }, []);

  useEffect(() => {
    if (!serviceHighlight || !selectedService) return;
    document.getElementById("service")?.focus({ preventScroll: true });
    const timer = window.setTimeout(() => setServiceHighlight(false), 2000);
    return () => window.clearTimeout(timer);
  }, [serviceHighlight, selectedService]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          service: formData.get("service"),
          date: formData.get("date"),
          time: formData.get("time"),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
      setMessage(data.message);
      if (data.manageUrl) setManageUrl(data.manageUrl);
      setSelectedService("");
      form.reset();
    } catch {
      setStatus("error");
      setMessage(
        `Unable to submit your booking. Please call us at ${site.contact.phones[0]}.`
      );
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className={className}>
      {status === "success" ? (
        <div className="card text-center">
          <CheckCircle className="mx-auto size-12 text-primary" />
          <h3 className="mt-4 text-lg font-semibold text-dark">Booking Confirmed!</h3>
          <p className="mt-2 text-sm text-muted">{message}</p>
          {manageUrl && (
            <a href={manageUrl} className="btn-cta mt-6 inline-flex">
              Manage Appointment
            </a>
          )}
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setSelectedService("");
            }}
            className="mt-3 block w-full text-sm text-primary hover:underline"
          >
            Book another appointment
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                className="input-field"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-field"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                Phone *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="input-field"
                placeholder="(416) 555-0142"
              />
            </div>
            <div>
              <label htmlFor="service" className="mb-1.5 block text-sm font-medium text-gray-700">
                Service *
              </label>
              <select
                id="service"
                name="service"
                required
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className={`input-field transition-shadow duration-300 ${
                  serviceHighlight ? "ring-2 ring-primary/40" : ""
                }`}
              >
                <option value="">Select a service</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="mb-1.5 block text-sm font-medium text-gray-700">
                Preferred Date *
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                min={minDate}
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="time" className="mb-1.5 block text-sm font-medium text-gray-700">
                Preferred Time *
              </label>
              <select id="time" name="time" required className="input-field">
                <option value="">Select a time</option>
                {booking.timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {status === "error" && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-cta w-full disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Book Appointment"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
