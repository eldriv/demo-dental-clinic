import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ManageAppointment } from "@/components/booking/ManageAppointment";
import { getBookingByToken } from "@/lib/bookings-store";
import { createMetadata } from "@/lib/seo";
import { site } from "@/content";

interface ManagePageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: ManagePageProps) {
  const { token } = await params;
  return createMetadata({
    title: "Manage Appointment",
    path: `/manage/${token}`,
    noIndex: true,
  });
}

export default async function ManagePage({ params }: ManagePageProps) {
  const { token } = await params;
  const booking = await getBookingByToken(token);

  if (!booking) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 section-padding page-x pt-28">
        <div className="section-inner">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-dark">Manage Your Appointment</h1>
            <p className="mt-2 text-muted">
              {site.name} — View, reschedule, or cancel your booking
            </p>
          </div>
          <ManageAppointment initialBooking={booking} />
          <p className="mt-8 text-center text-sm text-muted">
            <Link href="/" className="text-primary hover:underline">
              &larr; Back to homepage
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
