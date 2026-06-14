"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CalendarOff,
  CalendarRange,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import type { AdminRole } from "@/content/admin";
import { canManageClinicSettings, getRoleLabel } from "@/content/admin";
import { site } from "@/content";

interface AdminShellProps {
  userName: string;
  userRole: AdminRole;
  children: React.ReactNode;
}

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, ownerOnly: false },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays, ownerOnly: false },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarRange, ownerOnly: false },
  { href: "/admin/dentists", label: "Dentists", icon: Users, ownerOnly: false },
  { href: "/admin/hours", label: "Clinic Hours", icon: Clock, ownerOnly: false },
  { href: "/admin/schedule", label: "Block Schedule", icon: CalendarOff, ownerOnly: false },
];

const mobileNavItems = navItems.filter((item) =>
  ["/admin", "/admin/appointments", "/admin/calendar"].includes(item.href)
);

export function AdminShell({ userName, userRole, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const visibleNav = navItems.filter(
    (item) => !item.ownerOnly || canManageClinicSettings(userRole)
  );

  const currentPage =
    visibleNav.find(
      (item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
    )?.label ?? "Dashboard";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/admin" && pathname.startsWith(href));
  }

  function renderSidebarContent(showClose: boolean) {
    return (
      <div className="flex h-full flex-col gap-6 p-4 lg:p-5">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/10">
              <Stethoscope className="size-5 text-primary-light" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{site.name}</p>
              <p className="text-xs text-white/60">Staff dashboard</p>
            </div>
          </div>
          {showClose && (
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="admin-icon-btn admin-icon-btn-dark"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        <nav className="grid gap-1">
          {visibleNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`admin-nav-link ${isActive(href) ? "admin-nav-link-active" : ""}`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
          <div className="rounded-xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
            <p className="truncate text-sm font-semibold text-white">{userName}</p>
            <p className="text-xs text-white/60">{getRoleLabel(userRole)}</p>
          </div>
          <Link href="/" target="_blank" className="admin-nav-link text-white/70">
            <ExternalLink className="size-4" />
            View website
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="admin-nav-link w-full text-red-300 hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Mobile top bar */}
      <header className="admin-mobile-header lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="admin-icon-btn"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <div className="min-w-0 flex-1 px-2">
          <p className="truncate text-sm font-semibold text-dark">{currentPage}</p>
          <p className="truncate text-xs text-muted">{site.name}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Stethoscope className="size-4" />
        </div>
      </header>

      {/* Mobile drawer — only mounted when open */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="admin-sidebar-backdrop lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="admin-sidebar-drawer lg:hidden" aria-hidden={false}>
            {renderSidebarContent(true)}
          </aside>
        </>
      )}

      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="admin-sidebar-desktop hidden lg:flex">
        {renderSidebarContent(false)}
      </aside>

      <div className="admin-main">
        <main className="admin-content">{children}</main>
      </div>

      {/* Mobile bottom nav — quick access to main sections */}
      <nav className="admin-bottom-nav lg:hidden" aria-label="Quick navigation">
        {mobileNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`admin-bottom-nav-link ${isActive(href) ? "admin-bottom-nav-link-active" : ""}`}
          >
            <Icon className="size-5" />
            <span>{label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
