import { cache } from "react";

import { prisma } from "@/lib/prisma";

export const THEME_COOKIE = "birdnav_theme";

export const defaultOptions = {
  "site.title": "BIRDNAV",
  "site.subtitle": "Curated links for focused browsing.",
  "site.description": "A sharp-edged navigation site for curated links and focused browsing.",
  "site.keywords": "navigation, links, bookmarks, BirdNav",
  "site.url": "",
  "site.og_image": "",
  "ui.radius": "0",
  "site.click_behavior": "detail",
  "home.page_size": "100",
  "home.featured_limit": "12",
  "footer.copyright": "© 2026 BirdNav. All rights reserved.",
  "footer.links": "OpenAI|https://openai.com\nGitHub|https://github.com",
} as const;

export type SiteClickBehavior = "detail" | "direct";
export type ThemeMode = "dark" | "light";

export function isThemeMode(value: string): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function isSiteClickBehavior(value: string): value is SiteClickBehavior {
  return value === "detail" || value === "direct";
}

const loadOptionsMap = cache(async () => {
  try {
    const items = await prisma.option.findMany();

    return items.reduce<Record<string, string>>((acc, item) => {
      acc[item.optKey] = item.optValue;
      return acc;
    }, {});
  } catch {
    return {};
  }
});

export async function getOptionsMap() {
  return loadOptionsMap();
}

export async function getOptionValue(key: keyof typeof defaultOptions | string, fallback?: string) {
  const options = await loadOptionsMap();

  if (options[key]) {
    return options[key];
  }

  return fallback ?? defaultOptions[key as keyof typeof defaultOptions] ?? "";
}

export async function upsertOption(optKey: string, optValue: string) {
  return prisma.option.upsert({
    where: { optKey },
    update: { optValue },
    create: { optKey, optValue },
  });
}

export function parseFooterLinks(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href] = line.split("|").map((part) => part.trim());

      return {
        label: label || href || "",
        href: href || "#",
      };
    })
    .filter((item) => item.label && item.href);
}
