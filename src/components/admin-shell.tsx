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
  { href: "/", label: "查看前台" },
];

export function AdminShell({
  currentPath,
  username,
  children,
}: AdminShellProps) {
  return (
    <div className="min-h-screen text-[var(--color-ink)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 px-4 py-4 lg:grid-cols-[260px_1fr] lg:gap-4 lg:px-6 lg:py-6">
        <aside className="tech-panel-strong overflow-hidden lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="tech-grid border-b border-[var(--color-line)] px-6 py-7">
            <p className="eyebrow">BirdNav Admin</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">导航控制台</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--color-muted)]">
              以更平滑的直线视觉管理你的分类、站点与展示状态。
            </p>
            <div className="mt-5">
              <span className="status-chip">admin / {username}</span>
            </div>
          </div>
          <nav className="flex flex-col px-4 py-4">
            {navItems.map((item) => {
              const active = currentPath === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-2 border px-4 py-3 text-sm transition-colors ${
                    active
                      ? "border-[var(--color-line-strong)] bg-[rgba(255,255,255,0.04)] text-[var(--color-ink)]"
                      : "border-transparent text-[var(--color-muted)] hover:border-[var(--color-line)] hover:bg-[rgba(255,255,255,0.02)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <form action="/admin/logout" method="post" className="mt-auto p-4 lg:absolute lg:bottom-0 lg:left-0 lg:right-0">
            <button className="button-secondary w-full" type="submit">
              退出登录
            </button>
          </form>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
