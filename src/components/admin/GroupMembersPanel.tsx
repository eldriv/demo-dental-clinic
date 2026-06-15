import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import type { Booking } from "@/lib/bookings";
import {
  buildGroupMemberRows,
  type GroupMemberRow,
} from "@/lib/booking-group";

function telHref(phone?: string): string | undefined {
  const digits = phone?.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}

interface GroupMembersPanelProps {
  booking?: Booking;
  members?: GroupMemberRow[];
  timeRange?: string;
  className?: string;
}

export function GroupMembersPanel({
  booking,
  members,
  timeRange,
  className = "",
}: GroupMembersPanelProps) {
  const rows = members ?? (booking ? buildGroupMemberRows(booking) : []);
  if (rows.length === 0) return null;

  return (
    <div className={`admin-group-members ${className}`}>
      {timeRange && (
        <p className="admin-group-members-meta text-xs text-muted">{timeRange}</p>
      )}
      <ul className="admin-group-members-list">
        {rows.map((member, index) => (
          <li key={`${member.role}-${member.email ?? member.name}-${index}`} className="admin-group-member-row">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {member.email ? (
                  <Link
                    href={`/admin/patients?email=${encodeURIComponent(member.email)}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {member.name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-slate-800">{member.name}</span>
                )}
                <span
                  className={`admin-group-member-role ${
                    member.role === "organizer" ? "admin-group-member-role-organizer" : ""
                  }`}
                >
                  {member.role === "organizer" ? "Organizer" : "Patient"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{member.service}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                {member.email ? (
                  <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                    <Mail className="size-3" />
                    {member.email}
                  </a>
                ) : (
                  <span className="text-muted/80">No email</span>
                )}
                {member.phone ? (
                  <a
                    href={telHref(member.phone)}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    <Phone className="size-3" />
                    {member.phone}
                  </a>
                ) : (
                  <span className="text-muted/80">No phone</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
