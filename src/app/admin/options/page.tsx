import { updateOptionsAction } from "@/app/admin/options/actions";
import { buildCurrentOptions } from "@/app/admin/options/schema";
import { AdminFeedback } from "@/components/admin-feedback";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { getOptionsMap, parseFooterLinks } from "@/lib/options";

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
  const currentOptions = buildCurrentOptions(storedOptions);
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
            <span>SEO ready</span>
            <span>radius {currentOptions["ui.radius"]}px</span>
            <span>click {currentOptions["site.click_behavior"]}</span>
            <span>home {currentOptions["home.page_size"]}</span>
            <span>featured {currentOptions["home.featured_limit"]}</span>
            <span>{footerLinks.length} footer links</span>
          </>
        }
      />

      <AdminFeedback success={successMessage} error={errorMessage} />

      <form action={updateOptionsAction} className="admin-settings-shell">
        <section className="admin-settings-panel">
          <div className="admin-board-head">
            <div>
              <p className="eyebrow">Site</p>
              <h3>站点基础</h3>
            </div>
            <span className="admin-settings-hint">展示、交互与界面风格</span>
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
            <label className="admin-field">
              <span>圆角大小</span>
              <input
                className="input"
                name="ui.radius"
                type="number"
                min="0"
                max="24"
                step="1"
                defaultValue={currentOptions["ui.radius"]}
              />
            </label>
            <label className="admin-field">
              <span>前台分页大小</span>
              <input
                className="input"
                name="home.page_size"
                type="number"
                min="1"
                max="500"
                step="1"
                defaultValue={currentOptions["home.page_size"]}
              />
            </label>
            <label className="admin-field">
              <span>推广展示数量</span>
              <input
                className="input"
                name="home.featured_limit"
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue={currentOptions["home.featured_limit"]}
              />
            </label>
          </div>
        </section>

        <section className="admin-settings-panel">
          <div className="admin-board-head">
            <div>
              <p className="eyebrow">SEO</p>
              <h3>搜索与分享</h3>
            </div>
            <span className="admin-settings-hint">用于 metadata / Open Graph</span>
          </div>
          <div className="admin-settings-grid">
            <label className="admin-field lg:col-span-2">
              <span>SEO 描述</span>
              <textarea
                className="input min-h-24 resize-y"
                name="site.description"
                defaultValue={currentOptions["site.description"]}
              />
            </label>
            <label className="admin-field lg:col-span-2">
              <span>SEO 关键词</span>
              <input
                className="input"
                name="site.keywords"
                defaultValue={currentOptions["site.keywords"]}
              />
              <small className="admin-settings-note">用英文逗号或中文逗号分隔</small>
            </label>
            <label className="admin-field">
              <span>站点公开地址</span>
              <input
                className="input"
                name="site.url"
                placeholder="https://example.com"
                defaultValue={currentOptions["site.url"]}
              />
            </label>
            <label className="admin-field">
              <span>分享封面图</span>
              <input
                className="input"
                name="site.og_image"
                placeholder="https://example.com/og.jpg"
                defaultValue={currentOptions["site.og_image"]}
              />
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
