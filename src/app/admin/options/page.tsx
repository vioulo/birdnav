import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminFeedback } from "@/components/admin-feedback";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { defaultOptions, getOptionsMap, parseFooterLinks, upsertOption } from "@/lib/options";
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

  const { siteTitle, siteSubtitle, clickBehavior, footerCopyright, footerLinks } = parsed.data;

  await Promise.all([
    upsertOption("site.title", siteTitle || defaultOptions["site.title"]),
    upsertOption("site.subtitle", siteSubtitle || defaultOptions["site.subtitle"]),
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
      siteTitle,
      siteSubtitle,
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
    "site.title":
      storedOptions["site.title"] || defaultOptions["site.title"],
    "site.subtitle":
      storedOptions["site.subtitle"] || defaultOptions["site.subtitle"],
    "site.click_behavior":
      storedOptions["site.click_behavior"] || defaultOptions["site.click_behavior"],
    "footer.copyright":
      storedOptions["footer.copyright"] || defaultOptions["footer.copyright"],
    "footer.links":
      storedOptions["footer.links"] || defaultOptions["footer.links"],
  };
  const footerLinks = parseFooterLinks(currentOptions["footer.links"]);

  return (
    <AdminShell currentPath="/admin/options" username={admin.username}>
      <AdminPageHeader
        eyebrow="Options"
        title="基础配置"
        description="控制前台展示、链接点击行为和 footer 文案。"
        meta={
          <>
            <span>{currentOptions["site.title"]}</span>
            <span>click {currentOptions["site.click_behavior"]}</span>
            <span>{footerLinks.length} footer links</span>
          </>
        }
      />

      <AdminFeedback success={successMessage} error={errorMessage} />

      <form action={updateOptions} className="admin-settings-shell">
        <section className="admin-settings-panel">
          <div className="admin-board-head">
            <div>
              <p className="eyebrow">Site</p>
              <h3>站点展示</h3>
            </div>
            <span className="admin-settings-hint">用于前台顶部品牌区</span>
          </div>
          <div className="admin-settings-grid">
            <label className="admin-field">
              <span>站点标题</span>
              <input
                className="input"
                name="site.title"
                defaultValue={currentOptions["site.title"]}
              />
            </label>
            <label className="admin-field lg:col-span-2">
              <span>站点副标题</span>
              <input
                className="input"
                name="site.subtitle"
                defaultValue={currentOptions["site.subtitle"]}
              />
            </label>
          </div>
        </section>

        <section className="admin-settings-panel">
          <div className="admin-board-head">
            <div>
              <p className="eyebrow">Behavior</p>
              <h3>访问行为</h3>
            </div>
            <span className="admin-settings-hint">影响前台默认体验</span>
          </div>
          <div className="admin-settings-grid">
            <label className="admin-field">
              <span>站点点击行为</span>
              <select
                className="input"
                name="site.click_behavior"
                defaultValue={currentOptions["site.click_behavior"]}
              >
                <option value="detail">进入详情页</option>
                <option value="direct">直接跳转</option>
              </select>
            </label>
          </div>
        </section>

        <section className="admin-settings-panel">
          <div className="admin-board-head">
            <div>
              <p className="eyebrow">Footer</p>
              <h3>页脚内容</h3>
            </div>
            <span className="admin-settings-hint">{footerLinks.length} 条友情链接</span>
          </div>
          <div className="admin-settings-grid">
            <label className="admin-field lg:col-span-2">
              <span>版权信息</span>
              <input
                className="input"
                name="footer.copyright"
                defaultValue={currentOptions["footer.copyright"]}
              />
            </label>
            <label className="admin-field lg:col-span-2">
              <span>友情链接</span>
              <textarea
                className="input min-h-36 resize-y"
                name="footer.links"
                defaultValue={currentOptions["footer.links"]}
              />
              <small className="admin-settings-note">每行格式：名称|链接</small>
            </label>
          </div>
        </section>

        <section className="admin-settings-submit">
          <div>
            <p className="eyebrow">Commit</p>
            <h3>保存并刷新前台缓存</h3>
          </div>
          <div className="admin-settings-submit-actions">
            <button className="button-primary" type="submit">
              保存配置
            </button>
          </div>
        </section>
      </form>
    </AdminShell>
  );
}
