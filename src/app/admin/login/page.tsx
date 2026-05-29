import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { attemptAdminLogin, getCurrentAdmin } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { parseLoginForm } from "@/lib/validation";

const LOGIN_RETRY_AFTER_DEFAULT_SECONDS = 900;

function getClientIpAddress(headerStore: Headers) {
  const forwardedFor = headerStore.get("x-forwarded-for");

  if (forwardedFor) {
    const firstForwardedIp = forwardedFor.split(",")[0]?.trim();

    if (firstForwardedIp) {
      return firstForwardedIp.slice(0, 120);
    }
  }

  const realIp = headerStore.get("x-real-ip")?.trim();
  return realIp ? realIp.slice(0, 120) : null;
}

async function handleLogin(formData: FormData) {
  "use server";

  const parsed = parseLoginForm(formData);

  if (!parsed.success) {
    redirect("/admin/login?error=validation");
  }

  const { username, password } = parsed.data;
  const headerStore = await headers();
  const ipAddress = getClientIpAddress(headerStore);
  const result = await attemptAdminLogin({
    username,
    password,
    ipAddress,
  });

  if (!result.ok) {
    await recordAuditLog({
      userId: result.userId,
      action: result.code === "rate_limited" ? "auth.login.blocked" : "auth.login.failed",
      targetType: "auth",
      targetId: username,
      summary:
        result.code === "rate_limited"
          ? `登录已被临时限制：${username}`
          : `登录失败：${username}`,
      payload: {
        ipAddress,
        retryAfterSeconds: result.retryAfterSeconds ?? null,
      },
    });

    if (result.code === "rate_limited") {
      redirect(
        `/admin/login?error=rate_limited&retryAfter=${result.retryAfterSeconds ?? LOGIN_RETRY_AFTER_DEFAULT_SECONDS}`,
      );
    }

    redirect("/admin/login?error=auth");
  }

  await recordAuditLog({
    userId: result.userId,
    action: "auth.login",
    targetType: "user",
    targetId: result.userId,
    summary: `管理员 ${result.username} 登录后台`,
    payload: {
      ipAddress,
    },
  });

  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; retryAfter?: string }>;
}) {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin");
  }

  const params = await searchParams;
  const retryAfterSeconds = Math.max(1, Number(params.retryAfter || "0") || 0);
  const errorMessage =
    params.error === "auth"
      ? "用户名或密码不正确。"
      : params.error === "rate_limited"
        ? `尝试过于频繁，请在 ${retryAfterSeconds || LOGIN_RETRY_AFTER_DEFAULT_SECONDS} 秒后重试。`
      : params.error === "validation"
        ? "请完整填写登录信息。"
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="tech-panel-strong w-full max-w-md overflow-hidden">
        <div className="tech-grid border-b border-[var(--color-line)] px-8 py-8">
          <p className="eyebrow">BirdNav</p>
          <h1 className="mt-3 text-3xl font-semibold">后台登录</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            使用你已初始化的管理员账号登录后即可管理分类与导航站点。
          </p>
        </div>
        <form action={handleLogin} className="space-y-5 px-8 py-8">
          <label className="block space-y-2">
            <span className="text-sm font-medium">用户名</span>
            <input className="input" name="username" autoComplete="username" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">密码</span>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {errorMessage ? (
            <p className="border border-[var(--color-danger)] px-4 py-3 text-sm text-[var(--color-danger)]">
              {errorMessage}
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
