import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sanitizeRedirectPath } from "@/lib/navigation";
import { THEME_COOKIE } from "@/lib/options";
import { themeRouteSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const formData = await request.formData();
  const fallbackRedirect = sanitizeRedirectPath(
    String(formData.get("redirectTo") || "/"),
  );
  const parsed = themeRouteSchema.safeParse({
    theme: formData.get("theme"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect(fallbackRedirect);
  }

  const nextTheme = parsed.data.theme;
  const redirectTo = sanitizeRedirectPath(parsed.data.redirectTo);

  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, nextTheme, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (request.headers.get("x-theme-update") === "1") {
    return new Response(null, { status: 204 });
  }

  redirect(redirectTo);
}
