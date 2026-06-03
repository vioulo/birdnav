"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "概览" },
  { href: "/admin/cats", label: "分类管理" },
  { href: "/admin/sites", label: "站点管理" },
  { href: "/admin/options", label: "基础配置" },
  { href: "/admin/account", label: "账户安全" },
  { href: "/admin/logs", label: "操作日志" },
  { href: "/", label: "查看前台", external: true },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      {navItems.map((item) => {
        const active = pathname === item.href;
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
