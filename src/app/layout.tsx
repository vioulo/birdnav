import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { BootVeil } from "@/components/boot-veil";
import { defaultOptions, getOptionsMap } from "@/lib/options";
import { getThemeMode } from "@/lib/theme";
import "./globals.css";

function splitKeywords(input: string) {
  return input
    .split(/[,，]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function readOption(options: Record<string, string>, key: keyof typeof defaultOptions) {
  return options[key] || defaultOptions[key];
}

function parseAbsoluteUrl(input: string) {
  if (!input) {
    return undefined;
  }

  try {
    return new URL(input);
  } catch {
    return undefined;
  }
}

function readUiRadius(options: Record<string, string>) {
  const value = Number.parseInt(readOption(options, "ui.radius"), 10);
  const radius = Number.isFinite(value) ? Math.min(Math.max(value, 0), 24) : 0;

  return `${radius}px`;
}

export async function generateMetadata(): Promise<Metadata> {
  const options = await getOptionsMap();
  const title = readOption(options, "site.title");
  const description = readOption(options, "site.description");
  const keywords = splitKeywords(readOption(options, "site.keywords"));
  const siteUrl = parseAbsoluteUrl(readOption(options, "site.url"));
  const ogImageUrl = readOption(options, "site.og_image");

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords,
    metadataBase: siteUrl,
    alternates: siteUrl
      ? {
          canonical: "/",
        }
      : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      url: siteUrl?.toString(),
      siteName: title,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: ogImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [themeMode, options] = await Promise.all([getThemeMode(), getOptionsMap()]);
  const rootStyle = {
    "--ui-radius": readUiRadius(options),
  } as CSSProperties;

  return (
    <html lang="zh-CN" data-theme={themeMode} className="h-full" style={rootStyle}>
      <body className="min-h-full flex flex-col">
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html:not(.is-boot-ready)::before{content:'';position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:#0f172a;animation:birdnavBootVeil 700ms ease forwards}@keyframes birdnavBootVeil{0%,72%{opacity:1;visibility:visible}100%{opacity:0;visibility:hidden}}html.is-boot-ready::before{opacity:0;visibility:hidden}",
          }}
        />
        <BootVeil />
        <noscript>
          <style>{"html::before{display:none!important}"}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
