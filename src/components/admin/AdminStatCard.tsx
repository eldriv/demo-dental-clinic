import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  href: string;
  icon: LucideIcon;
  accent?: "primary" | "amber" | "blue" | "neutral";
}

const accentStyles = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
  neutral: "bg-surface text-dark",
};

export function AdminStatCard({
  label,
  value,
  href,
  icon: Icon,
  accent = "primary",
}: AdminStatCardProps) {
  return (
    <Link href={href} className="admin-stat-card group block">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex size-10 items-center justify-center rounded-xl ${accentStyles[accent]}`}>
          <Icon className="size-5" />
        </div>
        <span className="text-xs font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">
          Open →
        </span>
      </div>
      <p className="mt-4 text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-dark">{value}</p>
    </Link>
  );
}
