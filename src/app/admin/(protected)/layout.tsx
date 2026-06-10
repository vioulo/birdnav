import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return <AdminShell username={admin.username}>{children}</AdminShell>;
}
