"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarOff,
  CalendarRange,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Users,
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

export function AdminShell({ userName, userRole, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleNav = navItems.filter(
    (item) => !item.ownerOnly || canManageClinicSettings(userRole)
  );

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="flex flex-col gap-6 p-4 lg:h-full lg:p-5">
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/10">
              <Stethoscope className="size-5 text-primary-light" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{site.name}</p>
              <p className="text-xs text-white/60">Staff dashboard</p>
            </div>
          </div>

          <nav className="grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
            {visibleNav.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || (href !== "/admin" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`admin-nav-link ${active ? "admin-nav-link-active" : ""}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
            <div className="rounded-xl bg-white/8 px-3 py-3 ring-1 ring-white/10">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="text-xs text-white/60">{getRoleLabel(userRole)}</p>
            </div>
            <Link
              href="/"
              target="_blank"
              className="admin-nav-link text-white/70"
            >
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
      </aside>

      <div className="admin-main">
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
