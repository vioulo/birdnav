import Link from "next/link";
import { revalidatePath } from "next/cache";

import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUrl } from "@/lib/utils";

const PAGE_SIZE = 10;

type SiteRow = {
  id: number;
  catId: number;
  name: string;
  url: string;
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

async function createSite(formData: FormData) {
  "use server";

  await requireAdmin();

  const catId = Number(formData.get("catId"));
  const name = String(formData.get("name") || "").trim();
  const url = normalizeUrl(String(formData.get("url") || ""));
  const description = String(formData.get("description") || "").trim();
  const featureImage = normalizeUrl(String(formData.get("featureImage") || ""));
  const isFeatured = formData.get("isFeatured") === "on";
  const sortOrder = Number(formData.get("sortOrder") || 0);
  const isPublished = formData.get("isPublished") === "on";

  if (!catId || !name || !url) {
    return;
  }

  await prisma.site.create({
    data: {
      catId,
      name,
      url,
      description: description || null,
      featureImage: featureImage || null,
      isFeatured,
      sortOrder,
      isPublished,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sites");
  revalidatePath("/");
}

async function updateSite(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = Number(formData.get("id"));
  const catId = Number(formData.get("catId"));
  const name = String(formData.get("name") || "").trim();
  const url = normalizeUrl(String(formData.get("url") || ""));
  const description = String(formData.get("description") || "").trim();
  const featureImage = normalizeUrl(String(formData.get("featureImage") || ""));
  const isFeatured = formData.get("isFeatured") === "on";
  const sortOrder = Number(formData.get("sortOrder") || 0);
  const isPublished = formData.get("isPublished") === "on";

  if (!id || !catId || !name || !url) {
    return;
  }

  await prisma.site.update({
    where: { id },
    data: {
      catId,
      name,
      url,
      description: description || null,
      featureImage: featureImage || null,
      isFeatured,
      sortOrder,
      isPublished,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sites");
  revalidatePath("/");
}

async function deleteSite(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = Number(formData.get("id"));

  if (!id) {
    return;
  }

  await prisma.site.delete({
    where: { id },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/sites");
  revalidatePath("/");
}

export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; modal?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1") || 1);
  const isCreateModalOpen = params.modal === "new";
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
              <div className="space-y-2">
                <input className="input" name="name" defaultValue={site.name} required />
                <input className="input" name="url" defaultValue={site.url} required />
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
                <button className="button-danger" type="submit" formAction={deleteSite}>
                  删除
                </button>
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
