import { redirect } from "next/navigation";

import { getCurrentAdmin, loginAdmin } from "@/lib/auth";

async function handleLogin(formData: FormData) {
  "use server";

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  const ok = await loginAdmin(username, password);

  if (!ok) {
    redirect("/admin/login?error=1");
  }

  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin");
  }

  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="tech-panel-strong w-full max-w-md overflow-hidden">
        <div className="tech-grid border-b border-[var(--color-line)] px-8 py-8">
          <p className="eyebrow">BirdNav</p>
          <h1 className="mt-3 text-3xl font-semibold">后台登录</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            使用默认管理员账号登录后即可管理分类与导航站点。
          </p>
        </div>
        <form action={handleLogin} className="space-y-5 px-8 py-8">
          <label className="block space-y-2">
            <span className="text-sm font-medium">用户名</span>
            <input className="input" name="username" defaultValue="admin" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">密码</span>
            <input
              className="input"
              name="password"
              type="password"
              defaultValue="admin123"
              required
            />
          </label>
          {hasError ? (
            <p className="border border-[var(--color-danger)] px-4 py-3 text-sm text-[var(--color-danger)]">
              用户名或密码不正确。
            </p>
          ) : null}
          <button className="button-primary w-full" type="submit">
            进入后台
          </button>
        </form>
      </div>
    </div>
  );
}
