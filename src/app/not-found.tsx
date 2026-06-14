import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center section-padding page-x pt-28 text-center">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="mt-4 text-lg text-muted">Page not found</p>
        <Link href="/" className="btn-cta mt-8">
          Back to Home
        </Link>
      </main>
      <Footer />
    </>
  );
}
