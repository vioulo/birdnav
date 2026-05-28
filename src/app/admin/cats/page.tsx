import { revalidatePath } from "next/cache";

import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function createCategory(formData: FormData) {
  "use server";

  await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const color = String(formData.get("color") || "#4c6fff").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!name) {
    return;
  }

  await prisma.category.create({
    data: {
      name,
      slug: slugify(slugInput || name),
      color,
      sortOrder,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/cats");
  revalidatePath("/admin/sites");
  revalidatePath("/");
}

async function updateCategory(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = Number(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const color = String(formData.get("color") || "#4c6fff").trim();
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (!id || !name) {
    return;
  }

  await prisma.category.update({
    where: { id },
    data: {
      name,
      slug: slugify(slugInput || name),
      color,
      sortOrder,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/cats");
  revalidatePath("/admin/sites");
  revalidatePath("/");
}

async function deleteCategory(formData: FormData) {
  "use server";

  await requireAdmin();

  const id = Number(formData.get("id"));

  if (!id) {
    return;
  }

  await prisma.category.delete({
    where: { id },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/cats");
  revalidatePath("/admin/sites");
  revalidatePath("/");
}

export default async function AdminCategoriesPage() {
  const admin = await requireAdmin();
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      _count: {
        select: {
          sites: true,
        },
      },
    },
  });

  return (
    <AdminShell currentPath="/admin/cats" username={admin.username}>
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <section className="tech-panel h-fit overflow-hidden">
          <div className="tech-grid border-b border-[var(--color-line)] px-8 py-8">
            <p className="eyebrow">Categories</p>
            <h2 className="mt-3 text-3xl font-semibold">新增分类</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              先定义内容分区，再把站点挂到对应分类下面。
            </p>
          </div>
          <form action={createCategory} className="space-y-5 px-8 py-8">
            <label className="block space-y-2">
              <span className="text-sm font-medium">分类名称</span>
              <input className="input" name="name" placeholder="例如：开发工具" required />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Slug</span>
              <input className="input" name="slug" placeholder="development-tools" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">排序</span>
              <input className="input" name="sortOrder" type="number" defaultValue="0" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">分类颜色</span>
              <input className="input h-12" name="color" type="color" defaultValue="#4c6fff" />
            </label>
            <button className="button-primary w-full" type="submit">
              保存分类
            </button>
          </form>
        </section>
        <section className="tech-panel overflow-hidden">
          <div className="border-b border-[var(--color-line)] px-8 py-8">
            <h3 className="text-2xl font-semibold">现有分类</h3>
          </div>
          <div>
            {categories.map((category) => (
              <form
                key={category.id}
                action={updateCategory}
                className="table-row space-y-5 px-8 py-8"
              >
                <input type="hidden" name="id" value={category.id} />
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr_120px_120px_140px]">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">分类名称</span>
                    <input className="input" name="name" defaultValue={category.name} required />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Slug</span>
                    <input className="input" name="slug" defaultValue={category.slug} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">排序</span>
                    <input
                      className="input"
                      name="sortOrder"
                      type="number"
                      defaultValue={category.sortOrder}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">颜色</span>
                    <input
                      className="input h-12"
                      name="color"
                      type="color"
                      defaultValue={category.color}
                    />
                  </label>
                  <div className="space-y-2">
                    <span className="block text-sm font-medium">站点数量</span>
                    <div className="input flex items-center">
                      {category._count.sites}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="button-primary" type="submit">
                    更新
                  </button>
                  <button
                    className="button-danger"
                    type="submit"
                    formAction={deleteCategory}
                  >
                    删除
                  </button>
                </div>
              </form>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
