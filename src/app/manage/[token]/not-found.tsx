import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function ManageNotFound() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center section-padding page-x pt-28 text-center">
        <h1 className="text-3xl font-bold text-dark">Appointment Not Found</h1>
        <p className="mt-4 max-w-md text-muted">
          This manage link is invalid, expired, or the booking was created on a different
          environment. Please submit a new booking on the live site.
        </p>
        <Link href="/#booking" className="btn-cta mt-8">
          Book an Appointment
        </Link>
        <Link href="/" className="mt-4 text-sm text-primary hover:underline">
          Back to Home
        </Link>
      </main>
      <Footer />
    </>
  );
}
