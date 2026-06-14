import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell userName={session.name} userRole={session.role}>
      {children}
    </AdminShell>
  );
}
