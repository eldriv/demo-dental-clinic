import { AdminHoursClient } from "@/components/admin/AdminHoursClient";
import {
  getClinicSettings,
  getClinicHoursDisplay,
} from "@/lib/clinic-settings-store";

export const dynamic = "force-dynamic";

export default async function AdminHoursPage() {
  const [settings, hours] = await Promise.all([
    getClinicSettings(),
    getClinicHoursDisplay(),
  ]);

  return <AdminHoursClient initialSettings={settings} initialHours={hours} />;
}
