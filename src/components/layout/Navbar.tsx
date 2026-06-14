"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { navLinks } from "@/content";
import { Logo } from "./Logo";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "px-4 pt-3 md:px-6" : ""
        }`}
      >
        <nav
          className={`mx-auto flex w-full max-w-7xl items-center justify-between gap-4 transition-all duration-300 ${
            scrolled
              ? "rounded-full bg-dark px-5 py-2.5 shadow-lg shadow-dark/20 md:px-6"
              : "bg-transparent px-4 py-4 sm:px-6 lg:px-8"
          }`}
          aria-label="Main navigation"
        >
          <Logo variant={scrolled ? "light" : "default"} />

          <ul className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    scrolled
                      ? "text-white/80 hover:bg-white/10 hover:text-white"
                      : "text-gray-700 hover:bg-primary/5 hover:text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden shrink-0 lg:block">
            <Link
              href="#booking"
              className={
                scrolled
                  ? "btn-cta btn-cta-sm btn-cta-accent"
                  : "btn-cta btn-cta-sm"
              }
            >
              Book Now
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className={`shrink-0 rounded-lg p-2 lg:hidden ${
              scrolled ? "text-white" : "text-dark"
            }`}
            aria-label="Open menu"
          >
            <Menu className="size-6" />
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-60 transition-opacity duration-300 lg:hidden ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-dark/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-[min(320px,85vw)] flex-col bg-white shadow-2xl transition-transform duration-300 ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 p-5">
            <Logo />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg p-2 text-dark"
              aria-label="Close menu"
            >
              <X className="size-6" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-base font-medium text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-gray-100 p-5">
            <Link
              href="#booking"
              onClick={() => setMenuOpen(false)}
              className="btn-cta w-full"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
