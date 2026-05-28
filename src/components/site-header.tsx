"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import type { ThemeMode } from "@/lib/options";

type HeaderAction = {
  label: string;
  href: string;
  external?: boolean;
  strong?: boolean;
};

type SiteHeaderProps = {
  meta: string[];
  children?: ReactNode;
  actions?: HeaderAction[];
  initialTheme?: ThemeMode;
  redirectTo?: string;
};

export function SiteHeader({
  meta,
  children,
  actions,
  initialTheme,
  redirectTo = "/",
}: SiteHeaderProps) {
  const themeToggle = <ThemeToggle initialTheme={initialTheme} redirectTo={redirectTo} />;

  return (
    <header className="site-header">
      <Link className="header-brand" href="/">
        <div className="logo">BIRDNAV</div>
        <div className="header-brand-meta">
          {meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </Link>
      {children}
      {actions?.length ? (
        <div className="site-header-actions">
          {actions.map((action) =>
            action.external ? (
              <a
                key={`${action.label}-${action.href}`}
                className={`header-action-link ${action.strong ? "is-strong" : ""}`}
                href={action.href}
                target="_blank"
                rel="noreferrer"
              >
                {action.label}
              </a>
            ) : (
              <Link
                key={`${action.label}-${action.href}`}
                className={`header-action-link ${action.strong ? "is-strong" : ""}`}
                href={action.href}
              >
                {action.label}
              </Link>
            ),
          )}
          {themeToggle}
        </div>
      ) : (
        themeToggle
      )}
    </header>
  );
}
