import { revalidatePath } from "next/cache";

import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUrl } from "@/lib/utils";

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

export default async function AdminSitesPage() {
  const admin = await requireAdmin();
  const [categories, sites] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    prisma.site.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        category: true,
      },
    }),
  ]);

  return (
    <AdminShell currentPath="/admin/sites" username={admin.username}>
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <section className="tech-panel h-fit overflow-hidden">
          <div className="tech-grid border-b border-[var(--color-line)] px-8 py-8">
            <p className="eyebrow">Sites</p>
            <h2 className="mt-3 text-3xl font-semibold">新增站点</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              为每个分类补充链接、简介和前台是否展示的状态。
            </p>
          </div>
          <form action={createSite} className="space-y-5 px-8 py-8">
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
                className="input min-h-28 resize-y"
                name="description"
                placeholder="一句话说明这个站点是做什么的"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">排序</span>
              <input className="input" name="sortOrder" type="number" defaultValue="0" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">推广图片</span>
              <input className="input" name="featureImage" placeholder="https://..." />
            </label>
            <label className="flex items-center gap-3 border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <input name="isFeatured" type="checkbox" />
              <span className="text-sm">加入推广区域</span>
            </label>
            <label className="flex items-center gap-3 border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
              <input name="isPublished" type="checkbox" defaultChecked />
              <span className="text-sm">前台显示</span>
            </label>
            <button className="button-primary w-full" type="submit">
              保存站点
            </button>
          </form>
        </section>
        <section className="tech-panel overflow-hidden">
          <div className="border-b border-[var(--color-line)] px-8 py-8">
            <h3 className="text-2xl font-semibold">现有站点</h3>
          </div>
          <div>
            {sites.map((site) => (
              <form
                key={site.id}
                action={updateSite}
                className="table-row space-y-5 px-8 py-8"
              >
                <input type="hidden" name="id" value={site.id} />
                <div className="grid gap-5 xl:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">所属分类</span>
                    <select className="input" name="catId" defaultValue={site.catId}>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">站点名称</span>
                    <input className="input" name="name" defaultValue={site.name} required />
                  </label>
                  <label className="block space-y-2 xl:col-span-2">
                    <span className="text-sm font-medium">链接</span>
                    <input className="input" name="url" defaultValue={site.url} required />
                  </label>
                  <label className="block space-y-2 xl:col-span-2">
                    <span className="text-sm font-medium">简介</span>
                    <textarea
                      className="input min-h-28 resize-y"
                      name="description"
                      defaultValue={site.description || ""}
                    />
                  </label>
                  <label className="block space-y-2 xl:col-span-2">
                    <span className="text-sm font-medium">推广图片</span>
                    <input
                      className="input"
                      name="featureImage"
                      defaultValue={site.featureImage || ""}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">排序</span>
                    <input
                      className="input"
                      name="sortOrder"
                      type="number"
                      defaultValue={site.sortOrder}
                    />
                  </label>
                  <label className="flex items-center gap-3 border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                    <input name="isFeatured" type="checkbox" defaultChecked={site.isFeatured} />
                    <span className="text-sm">加入推广区域</span>
                  </label>
                  <label className="flex items-center gap-3 border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                    <input name="isPublished" type="checkbox" defaultChecked={site.isPublished} />
                    <span className="text-sm">前台显示</span>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button className="button-primary" type="submit">
                    更新
                  </button>
                  <button className="button-danger" type="submit" formAction={deleteSite}>
                    删除
                  </button>
                  <span className="text-sm text-[var(--color-muted)]">
                    当前分类：{site.category.name}
                  </span>
                </div>
              </form>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
