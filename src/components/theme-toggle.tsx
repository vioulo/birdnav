import { getNextThemeMode, getThemeMode } from "@/lib/theme";

type ThemeToggleProps = {
  redirectTo?: string;
};

export async function ThemeToggle({ redirectTo = "/" }: ThemeToggleProps) {
  const currentTheme = await getThemeMode();
  const nextTheme = getNextThemeMode(currentTheme);

  return (
    <form action="/theme" method="post">
      <input type="hidden" name="theme" value={nextTheme} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button className="button-secondary theme-toggle-button" type="submit">
        {currentTheme === "dark" ? "Light" : "Dark"}
      </button>
    </form>
  );
}
