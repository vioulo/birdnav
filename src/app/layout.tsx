import type { Metadata } from "next";
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
  const themeMode = await getThemeMode();

  return (
    <html lang="zh-CN" data-theme={themeMode} className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
