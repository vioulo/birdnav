import Link from "next/link";

type AdminShellProps = {
  currentPath: string;
  username: string;
  children: React.ReactNode;
};

const navItems = [
  { href: "/admin", label: "概览" },
  { href: "/admin/cats", label: "分类管理" },
  { href: "/admin/sites", label: "站点管理" },
  { href: "/admin/options", label: "基础配置" },
  { href: "/admin/account", label: "账户安全" },
  { href: "/admin/logs", label: "操作日志" },
  { href: "/", label: "查看前台", external: true },
];

export function AdminShell({
  currentPath,
  username,
  children,
}: AdminShellProps) {
  return (
    <div className="admin-shell">
      <div className="admin-shell-grid">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-head tech-grid">
            <p className="eyebrow">BirdNav Admin</p>
            <h1>导航控制台</h1>
            <p className="admin-sidebar-desc">
              以更平滑的直线视觉管理你的分类、站点与展示状态。
            </p>
            <span className="status-chip">admin / {username}</span>
          </div>
          <nav className="admin-nav">
            {navItems.map((item) => {
              const active = currentPath === item.href;
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
          <form action="/admin/logout" method="post" className="admin-logout">
            <button className="button-secondary w-full" type="submit">
              退出登录
            </button>
          </form>
        </aside>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
