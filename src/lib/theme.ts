import { cookies } from "next/headers";

import { isThemeMode, THEME_COOKIE, type ThemeMode } from "@/lib/options";

export async function getThemeMode(): Promise<ThemeMode> {
  const cookieStore = await cookies();
  const cookieTheme = cookieStore.get(THEME_COOKIE)?.value;

  if (cookieTheme && isThemeMode(cookieTheme)) {
    return cookieTheme;
  }
  return "dark";
}

export function getNextThemeMode(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}
