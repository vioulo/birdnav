import { AdminNav } from "@/components/admin-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { getThemeMode } from "@/lib/theme";

type AdminShellProps = {
  currentPath: string;
  username: string;
  children: React.ReactNode;
};

export async function AdminShell({
  currentPath,
  username,
  children,
}: AdminShellProps) {
  const initialTheme = await getThemeMode();

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
            <div className="admin-sidebar-meta">
              <span className="status-chip">admin / {username}</span>
              <ThemeToggle initialTheme={initialTheme} redirectTo={currentPath} />
            </div>
          </div>
          <AdminNav />
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
