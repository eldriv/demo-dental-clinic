import { UserX } from "lucide-react";
import Link from "next/link";
import type { DentistLeaveItem } from "@/lib/dentist-leave";
import { formatLeaveRange } from "@/lib/dentist-leave";

interface DentistLeaveOverviewProps {
  todayLeaves: DentistLeaveItem[];
  upcomingLeaves: DentistLeaveItem[];
}

export function DentistLeaveOverview({
  todayLeaves,
  upcomingLeaves,
}: DentistLeaveOverviewProps) {
  const hasAny = todayLeaves.length > 0 || upcomingLeaves.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="admin-section-title">Dentist availability</h2>
          <p className="mt-1 text-sm text-muted">
            Who is on leave — front desk can see this before assigning patients.
          </p>
        </div>
        <Link
          href="/admin/schedule"
          className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-medium text-primary ring-1 ring-gray-200 transition-colors hover:bg-surface sm:w-auto"
        >
          Manage blocks
        </Link>
      </div>

      {!hasAny ? (
        <div className="admin-card-muted">
          <p className="text-sm text-muted">All dentists are available. No upcoming leave recorded.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="admin-card space-y-3">
            <h3 className="font-semibold text-dark">Unavailable today</h3>
            {todayLeaves.length === 0 ? (
              <p className="text-sm text-muted">Everyone is in today.</p>
            ) : (
              <ul className="space-y-2">
                {todayLeaves.map((leave) => (
                  <LeaveRow key={leave.blockId} leave={leave} highlight />
                ))}
              </ul>
            )}
          </div>

          <div className="admin-card space-y-3">
            <h3 className="font-semibold text-dark">Upcoming leave</h3>
            {upcomingLeaves.length === 0 ? (
              <p className="text-sm text-muted">No upcoming leave scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {upcomingLeaves.map((leave) => (
                  <LeaveRow key={leave.blockId} leave={leave} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function LeaveRow({ leave, highlight = false }: { leave: DentistLeaveItem; highlight?: boolean }) {
  return (
    <li
      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm ${
        highlight
          ? "border border-amber-100 bg-amber-50/90 text-amber-950"
          : "bg-surface/80 text-dark"
      }`}
    >
      <UserX className={`mt-0.5 size-4 shrink-0 ${highlight ? "text-amber-700" : "text-muted"}`} />
      <div>
        <p className="font-medium">{leave.dentistName}</p>
        <p className={highlight ? "text-amber-800" : "text-muted"}>
          {formatLeaveRange(leave.date, leave.endDate)}
          {leave.reason ? ` · ${leave.reason}` : ""}
        </p>
      </div>
    </li>
  );
}
