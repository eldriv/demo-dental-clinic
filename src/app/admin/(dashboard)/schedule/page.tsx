import { getAllScheduleBlocks } from "@/lib/schedule-blocks";
import { AdminScheduleClient } from "@/components/admin/AdminScheduleClient";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const blocks = await getAllScheduleBlocks();

  return <AdminScheduleClient initialBlocks={blocks} />;
}
