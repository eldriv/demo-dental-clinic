import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Services } from "@/components/sections/Services";
import { BeforeAfter } from "@/components/sections/BeforeAfter";
import { Team } from "@/components/sections/Team";
import { Testimonials } from "@/components/sections/Testimonials";
import { BookingSection } from "@/components/sections/BookingSection";
import { Contact } from "@/components/sections/Contact";

const FAQ = dynamic(() =>
  import("@/components/sections/FAQ").then((mod) => mod.FAQ)
);

export default async function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <About />
        <Services />
        <BeforeAfter />
        <Team />
        <Testimonials />
        <BookingSection />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
