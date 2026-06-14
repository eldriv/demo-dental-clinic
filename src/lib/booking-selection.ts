export const BOOKING_SERVICE_EVENT = "booking:select-service";

export function selectServiceForBooking(serviceName: string) {
  if (typeof window === "undefined") return;

  sessionStorage.setItem("prefillService", serviceName);
  window.dispatchEvent(
    new CustomEvent(BOOKING_SERVICE_EVENT, { detail: serviceName })
  );

  const bookingSection = document.getElementById("booking");
  if (bookingSection) {
    bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
