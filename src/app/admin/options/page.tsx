import { revalidatePath } from "next/cache";

import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { defaultOptions, getOptionsMap, upsertOption } from "@/lib/options";

async function updateOptions(formData: FormData) {
  "use server";

  await requireAdmin();

  const themeDefault = String(formData.get("theme.default") || "dark");
  const clickBehavior = String(formData.get("site.click_behavior") || "detail");
  const footerCopyright = String(formData.get("footer.copyright") || "").trim();
  const footerLinks = String(formData.get("footer.links") || "").trim();

  await Promise.all([
    upsertOption("theme.default", themeDefault),
    upsertOption("site.click_behavior", clickBehavior),
    upsertOption("footer.copyright", footerCopyright || defaultOptions["footer.copyright"]),
    upsertOption("footer.links", footerLinks || defaultOptions["footer.links"]),
  ]);

  revalidatePath("/");
  revalidatePath("/admin/options");
}

export default async function AdminOptionsPage() {
  const admin = await requireAdmin();
  const storedOptions = await getOptionsMap();
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
