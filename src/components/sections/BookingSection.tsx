"use client";

import dynamic from "next/dynamic";
import { booking, placeholders } from "@/content";
import { FadeIn } from "@/components/ui/FadeIn";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { SectionLabel } from "@/components/ui/SectionLabel";

const BookingForm = dynamic(
  () => import("@/components/booking/BookingForm").then((mod) => mod.BookingForm),
  { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-2xl bg-gray-100" /> }
);

export function BookingSection() {
  return (
    <section id="booking" className="section-padding page-x scroll-mt-24 md:scroll-mt-28">
      <div className="section-inner">
        <div className="relative overflow-hidden rounded-3xl bg-dark">
          <div className="absolute inset-0 opacity-20">
            <ImagePlaceholder
              label={placeholders.booking.label}
              src={placeholders.booking.src}
              aspectRatio="aspect-auto"
              rounded="none"
              className="placeholder-cover absolute inset-0 h-full w-full"
              sizes="100vw"
            />
          </div>
          <div className="absolute inset-0 bg-linear-to-br from-dark via-dark/95 to-dark-light/90" />

          <div className="relative grid gap-10 p-8 md:p-12 lg:grid-cols-2 lg:gap-16 lg:p-16">
            <FadeIn>
              <SectionLabel variant="on-dark">{booking.label}</SectionLabel>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                {booking.title}{" "}
                <span className="font-display italic text-accent">{booking.titleAccent}</span>{" "}
                {booking.titleEnd}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/70">
                {booking.description}
              </p>
            </FadeIn>

            <FadeIn delay={150}>
              <div className="rounded-2xl bg-white p-6 shadow-xl md:p-8">
                <BookingForm />
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
