import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_SC } from "next/font/google";
import { getThemeMode } from "@/lib/theme";
import "./globals.css";

const plexSans = Noto_Sans_SC({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "BirdNav",
  description: "A sharp-edged navigation site built with Next.js and MariaDB.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeMode = await getThemeMode();

  return (
    <html
      lang="zh-CN"
      data-theme={themeMode}
      className={`${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
