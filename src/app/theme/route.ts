import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { THEME_COOKIE, isThemeMode } from "@/lib/options";

export async function POST(request: Request) {
  const formData = await request.formData();
  const nextTheme = String(formData.get("theme") || "");
  const redirectTo = String(formData.get("redirectTo") || "/");

  if (!isThemeMode(nextTheme)) {
    redirect(redirectTo);
  }

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, nextTheme, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(redirectTo);
}
