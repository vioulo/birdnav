"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

import { appVersion } from "@/lib/app-version";
import type { ThemeMode } from "@/lib/options";

type V1ShellProps = {
  children: ReactNode;
  footerLinks: Array<{
    label: string;
    href: string;
  }>;
  footerText: string;
  initialTheme: ThemeMode;
  siteTitle: string;
  siteSubtitle: string;
  topbarContent?: ReactNode;
};

export function V1Shell({
  children,
  footerLinks,
  footerText,
  initialTheme,
  siteTitle,
  siteSubtitle,
  topbarContent,
}: V1ShellProps) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  function handleThemeToggle() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    const root = document.querySelector<HTMLElement>(".v1-theme");
    if (root) {
      root.dataset.v1Theme = nextTheme;
    }

    const formData = new FormData();
    formData.set("theme", nextTheme);
    formData.set("redirectTo", window.location.pathname);
    void fetch("/theme", {
      method: "POST",
      headers: {
        "x-theme-update": "1",
      },
      body: formData,
    });
  }

  return (
    <div className="v1-theme" data-v1-theme={theme}>
      <header className="v1-topbar">
        <div className="v1-topbar-inner">
          <Link className="v1-brand" href="/v1">
            <span className="v1-brand-icon" aria-hidden="true">
              😹
            </span>
            <span className="v1-brand-text">
              <span className="v1-brand-title">{siteTitle}</span>
              <span className="v1-brand-subtitle">{siteSubtitle}</span>
            </span>
          </Link>

          <div className="v1-topbar-center">
            {topbarContent}
            <Link className="v1-theme-switch" href="/">
              默认
            </Link>
            <button
              className="v1-theme-btn"
              type="button"
              title="切换主题"
              aria-label="切换主题"
              onClick={handleThemeToggle}
            >
              {theme === "dark" ? <Moon /> : <Sun />}
            </button>
          </div>
        </div>
      </header>

      {children}

      <footer className="v1-footer">
        <div className="v1-footer-inner">
          <p>
            {footerText}
            <br />
            {appVersion}
          </p>
          <div className="v1-footer-links">
            {footerLinks.map((link) => (
              <a key={`${link.label}-${link.href}`} href={link.href} target="_blank" rel="noreferrer">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
