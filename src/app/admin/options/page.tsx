import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { defaultOptions, getOptionsMap, upsertOption } from "@/lib/options";
import { parseOptionsForm } from "@/lib/validation";

function buildOptionsFeedbackHref(type: "success" | "error", message: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(type, message);
  return `/admin/options?${searchParams.toString()}`;
}

async function updateOptions(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const parsed = parseOptionsForm(formData);

  if (!parsed.success) {
    redirect(
      buildOptionsFeedbackHref(
        "error",
        parsed.error.issues[0]?.message || "配置内容无效。",
      ),
    );
  }

  const { themeDefault, clickBehavior, footerCopyright, footerLinks } = parsed.data;

  await Promise.all([
    upsertOption("theme.default", themeDefault),
    upsertOption("site.click_behavior", clickBehavior),
    upsertOption("footer.copyright", footerCopyright || defaultOptions["footer.copyright"]),
    upsertOption("footer.links", footerLinks || defaultOptions["footer.links"]),
  ]);

  revalidatePath("/");
  revalidatePath("/admin/options");

  await recordAuditLog({
    userId: admin.id,
    action: "options.update",
    targetType: "option",
    summary: "更新基础配置",
    payload: {
      themeDefault,
      clickBehavior,
      footerCopyright,
      footerLinksLineCount: footerLinks.split("\n").filter(Boolean).length,
    },
  });

  redirect(buildOptionsFeedbackHref("success", "配置保存成功。"));
}

export default async function AdminOptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const storedOptions = await getOptionsMap();
  const successMessage = params.success?.trim();
  const errorMessage = params.error?.trim();
  const currentOptions = {
    "theme.default":
      storedOptions["theme.default"] || defaultOptions["theme.default"],
    "site.click_behavior":
      storedOptions["site.click_behavior"] || defaultOptions["site.click_behavior"],
    "footer.copyright":
      storedOptions["footer.copyright"] || defaultOptions["footer.copyright"],
    "footer.links":
      storedOptions["footer.links"] || defaultOptions["footer.links"],
  };

  return (
    <AdminShell currentPath="/admin/options" username={admin.username}>
      <section className="tech-panel overflow-hidden">
        <div className="tech-grid border-b border-[var(--color-line)] px-8 py-8">
          <p className="eyebrow">Options</p>
          <h2 className="mt-3 text-3xl font-semibold">基础配置</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
            控制首页默认主题、链接点击行为和 footer 文案。
          </p>
        </div>
        {successMessage ? (
          <p className="mx-8 mt-8 border border-[var(--color-accent)] px-4 py-3 text-sm text-[var(--color-ink)]">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mx-8 mt-8 border border-[var(--color-danger)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {errorMessage}
          </p>
        ) : null}
        <form action={updateOptions} className="grid gap-4 p-8 lg:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">默认主题</span>
            <select className="input" name="theme.default" defaultValue={currentOptions["theme.default"]}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium">站点点击行为</span>
            <select
              className="input"
              name="site.click_behavior"
              defaultValue={currentOptions["site.click_behavior"]}
            >
              <option value="detail">进入详情页</option>
              <option value="direct">直接跳转</option>
            </select>
          </label>
          <label className="block space-y-2 lg:col-span-2">
            <span className="text-sm font-medium">版权信息</span>
            <input
              className="input"
              name="footer.copyright"
              defaultValue={currentOptions["footer.copyright"]}
            />
          </label>
          <label className="block space-y-2 lg:col-span-2">
            <span className="text-sm font-medium">友情链接</span>
            <textarea
              className="input min-h-36 resize-y"
              name="footer.links"
              defaultValue={currentOptions["footer.links"]}
            />
            <span className="text-xs text-[var(--color-muted)]">
              每行格式：名称|链接
            </span>
          </label>
          <div className="lg:col-span-2">
            <button className="button-primary" type="submit">
              保存配置
            </button>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
