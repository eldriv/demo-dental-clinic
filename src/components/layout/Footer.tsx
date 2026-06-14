import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  site,
  footerQuickLinks,
  footerCompanyLinks,
} from "@/content";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative mt-auto overflow-hidden rounded-t-[2.5rem] bg-dark text-white">
      <div className="section-padding page-x pb-32 md:pb-40">
        <div className="section-inner">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Logo variant="light" />
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                {site.description.slice(0, 120)}…
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
                Quick Links
              </h3>
              <ul className="space-y-2.5">
                {footerQuickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/80 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
                Company
              </h3>
              <ul className="space-y-2.5">
                {footerCompanyLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/80 transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
                Contact
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5 text-sm text-white/80">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>{site.location.full}</span>
                </li>
                {site.contact.phones.map((phone) => (
                  <li key={phone} className="flex items-center gap-2.5 text-sm text-white/80">
                    <Phone className="size-4 shrink-0 text-accent" />
                    <span>{phone}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2.5 text-sm text-white/80">
                  <Mail className="size-4 shrink-0 text-accent" />
                  <span>{site.contact.email}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Dotted divider */}
          <div className="my-10 border-t border-dashed border-white/15" />

          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-white/50">
              &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
            </p>
            <a
              href={site.contact.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-accent"
              aria-label="Facebook"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Follow us on Facebook
            </a>
          </div>
        </div>
      </div>

      {/* Watermark brand name */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
        aria-hidden
      >
        <p className="select-none whitespace-nowrap text-center font-display text-[clamp(4rem,15vw,12rem)] font-bold italic leading-none text-white/4">
          SmileCare
        </p>
      </div>
    </footer>
  );
}
