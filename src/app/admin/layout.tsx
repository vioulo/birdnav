import { headers } from "next/headers";

import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const rawUrl = headersList.get("x-url") || "";
  let pathname = "/admin";

  if (rawUrl) {
    try {
      pathname = new URL(rawUrl).pathname.replace(/\/+$/, "") || "/admin";
    } catch {
      // fallback
    }
  }

  // Login page doesn't need AdminShell or auth check
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const admin = await requireAdmin();

  return (
    <AdminShell currentPath={pathname} username={admin.username}>
      {children}
    </AdminShell>
  );
}
