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
  title?: string;
  meta: string[];
  children?: ReactNode;
  actions?: HeaderAction[];
  initialTheme?: ThemeMode;
  redirectTo?: string;
};

export function SiteHeader({
  title = "BIRDNAV",
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
        <div className="logo" aria-hidden="true">
          😹
        </div>
        <div className="header-brand-text">
          <div className="header-brand-title">{title}</div>
          <div className="header-brand-meta">
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </Link>
      <div className="site-header-right">
        {children}
        <div className="site-header-actions">
          {actions?.map((action) =>
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
          <Link className="header-action-link" href="/v1">
            V1
          </Link>
          {themeToggle}
        </div>
      </div>
    </header>
  );
}
