import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminFeedback } from "@/components/admin-feedback";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requireAdmin } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { getActionErrorMessage } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { discoverSiteIconUrl } from "@/lib/site-icon";
import { parseSiteForm } from "@/lib/validation";

const PAGE_SIZE = 10;

type SiteRow = {
  id: number;
  catId: number;
  name: string;
  url: string;
  iconUrl: string | null;
  description: string | null;
  featureImage: string | null;
  isFeatured: boolean;
  sortOrder: number;
  isPublished: boolean;
  category: {
    id: number;
    name: string;
    color: string;
  };
};

type SiteCategory = {
  id: number;
  name: string;
};

function buildSitesHref(page: number, keyword = "") {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  if (keyword) {
    searchParams.set("q", keyword);
  }

  const query = searchParams.toString();
  return query ? `/admin/sites?${query}` : "/admin/sites";
}

function buildSitesModalHref(page: number, keyword = "") {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  if (keyword) {
    searchParams.set("q", keyword);
  }

  searchParams.set("modal", "new");
  return `/admin/sites?${searchParams.toString()}`;
}

function buildSitesFeedbackHref(
  page: number,
  type: "success" | "error",
  message: string,
  modal?: "new",
  keyword = "",
) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  if (keyword) {
    searchParams.set("q", keyword);
  }

  if (modal) {
    searchParams.set("modal", modal);
  }

  searchParams.set(type, message);
  return `/admin/sites?${searchParams.toString()}`;
}

async function createSite(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const keyword = String(formData.get("q") || "").trim();
  const autoDiscoverIcon = formData.get("autoDiscoverIcon") === "on";

  const parsed = parseSiteForm(formData);

  if (!parsed.success) {
    redirect(
      buildSitesFeedbackHref(
        1,
        "error",
        parsed.error.issues[0]?.message || "站点信息无效。",
        "new",
        keyword,
      ),
    );
  }

  const {
    catId,
    name,
    url,
    iconUrl,
    description,
    featureImage,
    isFeatured,
    sortOrder,
    isPublished,
    page,
  } = parsed.data;

  let createdSite;

  try {
    const resolvedIconUrl = iconUrl || (autoDiscoverIcon ? await discoverSiteIconUrl(url) : null);

    createdSite = await prisma.site.create({
      data: {
        catId,
        name,
        url,
        iconUrl: resolvedIconUrl,
        description: description || null,
        featureImage: featureImage || null,
        isFeatured,
        sortOrder,
        isPublished,
      },
    });
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getActionErrorMessage(error, "创建站点失败。"),
        "new",
        keyword,
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/sites");
  revalidatePath("/");

  await recordAuditLog({
    userId: admin.id,
    action: "site.create",
    targetType: "site",
    targetId: createdSite.id,
    summary: `创建站点 ${createdSite.name}`,
    payload: {
      catId: createdSite.catId,
      autoDiscoveredIcon: autoDiscoverIcon && !iconUrl && !!createdSite.iconUrl,
      isFeatured: createdSite.isFeatured,
      isPublished: createdSite.isPublished,
    },
  });

  redirect(buildSitesFeedbackHref(page, "success", "站点创建成功。", undefined, keyword));
}

async function updateSite(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const keyword = String(formData.get("q") || "").trim();
  const parsed = parseSiteForm(formData);

  if (!id || !parsed.success) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        parsed.success ? "站点不存在。" : parsed.error.issues[0]?.message || "站点信息无效。",
        undefined,
        keyword,
      ),
    );
  }

  const {
    catId,
    name,
    url,
    iconUrl,
    description,
    featureImage,
    isFeatured,
    sortOrder,
    isPublished,
  } = parsed.data;

  let updatedSite;

  try {
    updatedSite = await prisma.site.update({
      where: { id },
      data: {
        catId,
        name,
        url,
        iconUrl: iconUrl || null,
        description: description || null,
        featureImage: featureImage || null,
        isFeatured,
        sortOrder,
        isPublished,
      },
    });
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getActionErrorMessage(error, "保存站点失败。"),
        undefined,
        keyword,
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/sites");
  revalidatePath("/");

  await recordAuditLog({
    userId: admin.id,
    action: "site.update",
    targetType: "site",
    targetId: updatedSite.id,
    summary: `更新站点 ${updatedSite.name}`,
    payload: {
      catId: updatedSite.catId,
      isFeatured: updatedSite.isFeatured,
      isPublished: updatedSite.isPublished,
    },
  });

  redirect(buildSitesFeedbackHref(page, "success", "站点保存成功。", undefined, keyword));
}

async function deleteSite(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const keyword = String(formData.get("q") || "").trim();

  if (!id) {
    redirect(buildSitesFeedbackHref(page, "error", "站点不存在。", undefined, keyword));
  }

  const site = await prisma.site.findUnique({
    where: { id },
  });

  if (!site) {
    redirect(buildSitesFeedbackHref(page, "error", "站点不存在。", undefined, keyword));
  }

  try {
    await prisma.site.delete({
      where: { id },
    });
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getActionErrorMessage(error, "删除站点失败。"),
        undefined,
        keyword,
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/sites");
  revalidatePath("/");

  await recordAuditLog({
    userId: admin.id,
    action: "site.delete",
    targetType: "site",
    targetId: site.id,
    summary: `删除站点 ${site.name}`,
    payload: {
      catId: site.catId,
      isFeatured: site.isFeatured,
      isPublished: site.isPublished,
    },
  });

  redirect(buildSitesFeedbackHref(page, "success", "站点删除成功。", undefined, keyword));
}

export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    modal?: string;
    success?: string;
    error?: string;
    q?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1") || 1);
  const isCreateModalOpen = params.modal === "new";
  const successMessage = params.success?.trim();
  const errorMessage = params.error?.trim();
  const keyword = params.q?.trim() || "";
  const skip = (page - 1) * PAGE_SIZE;
  const siteWhere: Prisma.SiteWhereInput = keyword
    ? {
        OR: [
          { name: { contains: keyword } },
          { url: { contains: keyword } },
          { iconUrl: { contains: keyword } },
          { description: { contains: keyword } },
          { category: { is: { name: { contains: keyword } } } },
        ],
      }
    : {};

  const [categories, total, sites]: [SiteCategory[], number, SiteRow[]] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.site.count({ where: siteWhere }),
    prisma.site.findMany({
      where: siteWhere,
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell currentPath="/admin/sites" username={admin.username}>
      <AdminPageHeader
        eyebrow="Sites"
        title="站点列表"
        description="默认展示核心信息，展开后再编辑，避免列表被表单噪音淹没。"
        meta={
          <>
            <span>total {total}</span>
            <span>page {page}/{totalPages}</span>
            {keyword ? <span>filter {keyword}</span> : <span>all records</span>}
          </>
        }
        actions={
          <Link className="button-primary" href={buildSitesModalHref(page, keyword)}>
            新建站点
          </Link>
        }
      />

      <AdminFeedback success={successMessage} error={errorMessage} />

      <section className="admin-record-shell">
        <div className="admin-data-table-toolbar">
          <div>
            <p className="eyebrow">Data Table</p>
            <h3>Site Index</h3>
          </div>
          <form action="/admin/sites" className="admin-data-table-search">
            <input
              className="input admin-data-table-search-input"
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="关键词筛选站点、链接、分类..."
            />
            <button className="button-secondary" type="submit">
              筛选
            </button>
            {keyword ? (
              <Link className="button-secondary" href="/admin/sites">
                清除
              </Link>
            ) : null}
          </form>
        </div>
        <div className="admin-data-table-columns is-site-table">
          <span>图标</span>
          <span>站点名称 / 链接</span>
          <span>所属分类</span>
          <span>排序权重</span>
          <span>推广状态</span>
          <span>发布状态</span>
          <span>操作</span>
        </div>
        <div className="admin-record-list">
          {sites.length ? (
            sites.map((site) => (
              <details key={site.id} className="admin-record">
                <summary className="admin-record-summary is-site-row">
                  <span className="admin-site-icon" aria-hidden="true">
                    {site.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={site.iconUrl} alt="" />
                    ) : (
                      <span>{site.name.trim().slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="admin-record-main">
                    <strong>{site.name}</strong>
                    <span>{site.url}</span>
                  </span>
                  <span className="admin-color-pill">
                    <span
                      className="inline-dot"
                      style={{
                        color: site.category.color,
                        backgroundColor: site.category.color,
                      }}
                      aria-hidden="true"
                    />
                    {site.category.name}
                  </span>
                  <span className="admin-table-cell">权重 {site.sortOrder}</span>
                  <span className={`admin-status-pill ${site.isFeatured ? "is-on" : ""}`}>
                    {site.isFeatured ? "已推广" : "未推广"}
                  </span>
                  <span className={`admin-status-pill ${site.isPublished ? "is-on" : "is-off"}`}>
                    {site.isPublished ? "已发布" : "已隐藏"}
                  </span>
                </summary>

                <form action={updateSite} className="admin-record-editor">
                  <input type="hidden" name="id" value={site.id} />
                  <input type="hidden" name="page" value={page} />
                  <input type="hidden" name="q" value={keyword} />
                  <div className="admin-edit-grid">
                    <label className="admin-field">
                      <span>站点名称</span>
                      <input className="input" name="name" defaultValue={site.name} required />
                    </label>
                    <label className="admin-field">
                      <span>链接</span>
                      <input className="input" name="url" defaultValue={site.url} required />
                    </label>
                    <label className="admin-field">
                      <span>站点 Icon</span>
                      <input
                        className="input"
                        name="iconUrl"
                        defaultValue={site.iconUrl || ""}
                        placeholder="站点 Icon 链接"
                      />
                    </label>
                    <label className="admin-field">
                      <span>推广图片</span>
                      <input
                        className="input"
                        name="featureImage"
                        defaultValue={site.featureImage || ""}
                        placeholder="推广图片链接"
                      />
                    </label>
                    <label className="admin-field">
                      <span>分类</span>
                      <select className="input" name="catId" defaultValue={site.catId}>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>排序</span>
                      <input
                        className="input"
                        name="sortOrder"
                        type="number"
                        defaultValue={site.sortOrder}
                      />
                    </label>
                    <label className="admin-field lg:col-span-2">
                      <span>简介</span>
                      <textarea
                        className="input min-h-24 resize-y"
                        name="description"
                        defaultValue={site.description || ""}
                      />
                    </label>
                  </div>
                  <div className="admin-record-actions">
                    <label className="admin-check">
                      <input name="isFeatured" type="checkbox" defaultChecked={site.isFeatured} />
                      推广
                    </label>
                    <label className="admin-check">
                      <input name="isPublished" type="checkbox" defaultChecked={site.isPublished} />
                      发布
                    </label>
                    <div className="list-actions">
                      <button className="button-secondary" type="submit">
                        保存
                      </button>
                      <ConfirmSubmitButton
                        className="button-danger"
                        formAction={deleteSite}
                        confirmMessage={`确认删除站点“${site.name}”？此操作不可撤销。`}
                      >
                        删除
                      </ConfirmSubmitButton>
                    </div>
                  </div>
                </form>
              </details>
            ))
          ) : (
            <div className="empty-state">还没有站点，先新建一个入口。</div>
          )}
        </div>
        <div className="pager">
          <p className="pager-meta">
            显示 {total === 0 ? 0 : skip + 1}-{Math.min(skip + PAGE_SIZE, total)} / {total}
          </p>
          <div className="pager-links">
            <Link
              className="button-secondary"
              href={page > 1 ? buildSitesHref(page - 1, keyword) : buildSitesHref(1, keyword)}
            >
              上一页
            </Link>
            <Link
              className="button-secondary"
              href={
                page < totalPages
                  ? buildSitesHref(page + 1, keyword)
                  : buildSitesHref(totalPages, keyword)
              }
            >
              下一页
            </Link>
          </div>
        </div>
      </section>

      {isCreateModalOpen ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Create</p>
                <h3 className="mt-1 text-xl font-semibold">新建站点</h3>
              </div>
              <Link className="button-secondary" href={buildSitesHref(page, keyword)}>
                关闭
              </Link>
            </div>
            <form action={createSite} className="modal-body admin-form-grid">
              <input type="hidden" name="page" value={page} />
              <input type="hidden" name="q" value={keyword} />
              <div className="admin-form-grid-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">所属分类</span>
                  <select className="input" name="catId" required defaultValue="">
                    <option value="" disabled>
                      选择分类
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">排序</span>
                  <input className="input" name="sortOrder" type="number" defaultValue="0" />
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium">站点名称</span>
                <input className="input" name="name" placeholder="例如：GitHub" required />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">链接</span>
                <input className="input" name="url" placeholder="https://github.com" required />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">站点 Icon</span>
                <input className="input" name="iconUrl" placeholder="可选，手动填写图标链接" />
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                <input name="autoDiscoverIcon" type="checkbox" />
                允许系统尝试抓取图标，仅限公网 80/443 站点
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">简介</span>
                <textarea
                  className="input min-h-24 resize-y"
                  name="description"
                  placeholder="一句话说明这个站点是做什么的"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">推广图片</span>
                <input className="input" name="featureImage" placeholder="https://..." />
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input name="isFeatured" type="checkbox" />
                  加入推广区域
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="isPublished" type="checkbox" defaultChecked />
                  前台显示
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Link className="button-secondary" href={buildSitesHref(page, keyword)}>
                  取消
                </Link>
                <button className="button-primary" type="submit">
                  保存站点
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
