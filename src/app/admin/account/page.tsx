import { redirect } from "next/navigation";

import { AdminFeedback } from "@/components/admin-feedback";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { changeAdminPassword, requireAdmin } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { parsePasswordChangeForm } from "@/lib/validation";

function buildAccountFeedbackHref(type: "success" | "error", message: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(type, message);
  return `/admin/account?${searchParams.toString()}`;
}

async function updatePassword(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const parsed = parsePasswordChangeForm(formData);

  if (!parsed.success) {
    redirect(
      buildAccountFeedbackHref(
        "error",
        parsed.error.issues[0]?.message || "密码信息无效。",
      ),
    );
  }

  const result = await changeAdminPassword({
    userId: admin.id,
    currentPassword: parsed.data.currentPassword,
    nextPassword: parsed.data.nextPassword,
  });

  if (!result.ok) {
    redirect(buildAccountFeedbackHref("error", result.message));
  }

  await recordAuditLog({
    userId: admin.id,
    action: "admin.password.update",
    targetType: "user",
    targetId: admin.id,
    summary: `管理员 ${admin.username} 更新了登录密码`,
    payload: {
      revokedOtherSessions: true,
    },
  });

  redirect(buildAccountFeedbackHref("success", "密码修改成功，旧会话已失效。"));
}

export default async function AdminAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const successMessage = params.success?.trim();
  const errorMessage = params.error?.trim();

  return (
    <AdminShell currentPath="/admin/account" username={admin.username}>
      <AdminPageHeader
        eyebrow="Account"
        title="账户安全"
        description="定期更换后台密码，避免长期使用初始化密码。"
      />

      <AdminFeedback success={successMessage} error={errorMessage} />

      <section className="tech-panel overflow-hidden">
        <form action={updatePassword} className="grid gap-4 p-8 lg:max-w-2xl">
          <label className="block space-y-2">
            <span className="text-sm font-medium">当前密码</span>
            <input className="input" name="currentPassword" type="password" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">新密码</span>
            <input className="input" name="nextPassword" type="password" minLength={8} required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">确认新密码</span>
            <input className="input" name="confirmPassword" type="password" minLength={8} required />
          </label>
          <div>
            <button className="button-primary" type="submit">
              更新密码
            </button>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
