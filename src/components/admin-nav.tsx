"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderTree,
  Globe,
  Settings,
  ShieldCheck,
  ScrollText,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/cats", label: "分类管理", icon: FolderTree },
  { href: "/admin/sites", label: "站点管理", icon: Globe },
  { href: "/admin/options", label: "基础配置", icon: Settings },
  { href: "/admin/account", label: "账户安全", icon: ShieldCheck },
  { href: "/admin/logs", label: "操作日志", icon: ScrollText },
  { href: "/", label: "查看前台", icon: ExternalLink, external: true },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        const className = [
          "admin-nav-link",
          active ? "active" : "",
          item.external ? "is-front-stage" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={className}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer" : undefined}
          >
            <Icon size={16} strokeWidth={1.75} className="admin-nav-icon" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
