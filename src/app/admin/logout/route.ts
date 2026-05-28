import { redirect } from "next/navigation";

import { logoutAdmin } from "@/lib/auth";

export async function POST() {
  await logoutAdmin();
  redirect("/admin/login");
}
