import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

function buildSitesHref(page: number) {
  return page > 1 ? `/admin/sites?page=${page}` : "/admin/sites";
}

function buildSitesModalHref(page: number) {
  return `${buildSitesHref(page)}${page > 1 ? "&" : "?"}modal=new`.replace("?&", "?");
}

function buildSitesFeedbackHref(
  page: number,
  type: "success" | "error",
  message: string,
  modal?: "new",
) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
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

  const parsed = parseSiteForm(formData);

  if (!parsed.success) {
    redirect(
      buildSitesFeedbackHref(
        1,
        "error",
        parsed.error.issues[0]?.message || "站点信息无效。",
        "new",
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
    const resolvedIconUrl = iconUrl || await discoverSiteIconUrl(url);

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
      isFeatured: createdSite.isFeatured,
      isPublished: createdSite.isPublished,
    },
  });

  redirect(buildSitesFeedbackHref(page, "success", "站点创建成功。"));
}

async function updateSite(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const parsed = parseSiteForm(formData);

  if (!id || !parsed.success) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        parsed.success ? "站点不存在。" : parsed.error.issues[0]?.message || "站点信息无效。",
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

  redirect(buildSitesFeedbackHref(page, "success", "站点保存成功。"));
}

async function deleteSite(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));

  if (!id) {
    redirect(buildSitesFeedbackHref(page, "error", "站点不存在。"));
  }

  const site = await prisma.site.findUnique({
    where: { id },
  });

  if (!site) {
    redirect(buildSitesFeedbackHref(page, "error", "站点不存在。"));
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

  redirect(buildSitesFeedbackHref(page, "success", "站点删除成功。"));
}

export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; modal?: string; success?: string; error?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1") || 1);
  const isCreateModalOpen = params.modal === "new";
  const successMessage = params.success?.trim();
  const errorMessage = params.error?.trim();
  const skip = (page - 1) * PAGE_SIZE;

  const [categories, total, sites]: [SiteCategory[], number, SiteRow[]] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.site.count(),
    prisma.site.findMany({
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
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Sites</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">站点列表</h2>
        </div>
        <div className="admin-toolbar-meta">
          <span>total {total}</span>
          <span>page {page}/{totalPages}</span>
          <Link className="button-primary" href={buildSitesModalHref(page)}>
            新建站点
          </Link>
        </div>
      </div>

      {successMessage ? (
        <p className="mb-3 border border-[var(--color-accent)] px-4 py-3 text-sm text-[var(--color-ink)]">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mb-3 border border-[var(--color-danger)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {errorMessage}
        </p>
      ) : null}

      <section className="list-shell">
        <div className="list-head md:grid-cols-[1.1fr_1fr_100px_100px_110px_180px]">
          <div>站点</div>
          <div>分类</div>
          <div>排序</div>
          <div>推广</div>
          <div>发布</div>
          <div className="text-right">操作</div>
        </div>
        <div>
          {sites.map((site) => (
            <form
              key={site.id}
              action={updateSite}
              className="list-row md:grid-cols-[1.1fr_1fr_100px_100px_110px_180px]"
            >
              <input type="hidden" name="id" value={site.id} />
              <input type="hidden" name="page" value={page} />
              <div className="space-y-2">
                <input className="input" name="name" defaultValue={site.name} required />
                <input className="input" name="url" defaultValue={site.url} required />
                <input
                  className="input"
                  name="iconUrl"
                  defaultValue={site.iconUrl || ""}
                  placeholder="站点 Icon 链接"
                />
                <textarea
                  className="input min-h-24 resize-y"
                  name="description"
                  defaultValue={site.description || ""}
                />
                <input
                  className="input"
                  name="featureImage"
                  defaultValue={site.featureImage || ""}
                  placeholder="推广图片链接"
                />
              </div>
              <div className="space-y-2">
                <select className="input" name="catId" defaultValue={site.catId}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                  <span
                    className="inline-dot"
                    style={{
                      color: site.category.color,
                      backgroundColor: site.category.color,
                    }}
                  />
                  <span>{site.category.name}</span>
                </div>
              </div>
              <input
                className="input"
                name="sortOrder"
                type="number"
                defaultValue={site.sortOrder}
              />
              <label className="flex items-center gap-2 text-sm">
                <input name="isFeatured" type="checkbox" defaultChecked={site.isFeatured} />
                推广
              </label>
              <label className="flex items-center gap-2 text-sm">
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
            </form>
          ))}
        </div>
        <div className="pager">
          <p className="pager-meta">
            显示 {skip + 1}-{Math.min(skip + PAGE_SIZE, total)} / {total}
          </p>
          <div className="pager-links">
            <Link
              className="button-secondary"
              href={page > 1 ? buildSitesHref(page - 1) : buildSitesHref(1)}
            >
              上一页
            </Link>
            <Link
              className="button-secondary"
              href={page < totalPages ? buildSitesHref(page + 1) : buildSitesHref(totalPages)}
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
              <Link className="button-secondary" href={buildSitesHref(page)}>
                关闭
              </Link>
            </div>
            <form action={createSite} className="modal-body admin-form-grid">
              <input type="hidden" name="page" value={page} />
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
                <input className="input" name="iconUrl" placeholder="留空自动获取 favicon" />
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
                <Link className="button-secondary" href={buildSitesHref(page)}>
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
