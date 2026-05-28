import type { Metadata } from "next";
import { getThemeMode } from "@/lib/theme";
import "./globals.css";

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
    <html lang="zh-CN" data-theme={themeMode} className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
