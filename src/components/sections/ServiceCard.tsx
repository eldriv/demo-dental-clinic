"use client";

import { useEffect, useRef, useState } from "react";
import {
  Stethoscope,
  Sparkles,
  Shield,
  HeartPulse,
  Scissors,
  Crown,
  Link as LinkIcon,
  Anchor,
  Sun,
  AlignCenter,
  Grid3x3,
  Baby,
  Activity,
  Siren,
  Scan,
  Search,
  Moon,
  Gem,
  Smile,
  Bone,
  type LucideIcon,
} from "lucide-react";
import type { Service } from "@/content";
import { selectServiceForBooking } from "@/lib/booking-selection";

const iconMap: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  sparkles: Sparkles,
  shield: Shield,
  "heart-pulse": HeartPulse,
  scissors: Scissors,
  crown: Crown,
  link: LinkIcon,
  anchor: Anchor,
  sun: Sun,
  "align-center": AlignCenter,
  "grid-3x3": Grid3x3,
  baby: Baby,
  activity: Activity,
  siren: Siren,
  scan: Scan,
  search: Search,
  moon: Moon,
  gem: Gem,
  smile: Smile,
  bone: Bone,
};

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const Icon = iconMap[service.icon] ?? Stethoscope;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncViewport = () => setIsDesktop(media.matches);
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setInView(false);
      return;
    }

    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.55, rootMargin: "-8% 0px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isDesktop]);

  const showMobileBook = inView && !isDesktop;

  return (
    <div
      ref={cardRef}
      className="card group relative flex h-full gap-3 overflow-hidden transition-all duration-200 hover:shadow-md hover:ring-primary/20 sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
          <Icon className="size-5" strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-semibold text-dark">{service.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{service.description}</p>
      </div>

      <div className="flex shrink-0 items-center self-center">
        <button
          type="button"
          onClick={() => selectServiceForBooking(service.name)}
          tabIndex={showMobileBook ? 0 : -1}
          aria-hidden={!showMobileBook && !isDesktop ? true : undefined}
          className={`btn-cta btn-cta-sm whitespace-nowrap px-3 py-1.5 text-xs transition-all duration-200 ${
            showMobileBook
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none translate-x-2 opacity-0"
          } lg:pointer-events-auto lg:translate-x-2 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-x-0 lg:group-focus-within:opacity-100`}
          aria-label={`Book ${service.name}`}
        >
          Book
        </button>
      </div>
    </div>
  );
}
