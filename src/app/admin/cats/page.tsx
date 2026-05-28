import Link from "next/link";
import { revalidatePath } from "next/cache";

import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const PAGE_SIZE = 10;

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
  _count: {
    sites: number;
  };
};

function buildCatsHref(page: number) {
  return page > 1 ? `/admin/cats?page=${page}` : "/admin/cats";
}

function buildCatsModalHref(page: number) {
  return `${buildCatsHref(page)}${page > 1 ? "&" : "?"}modal=new`.replace("?&", "?");
}

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

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; modal?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1") || 1);
  const isCreateModalOpen = params.modal === "new";
  const skip = (page - 1) * PAGE_SIZE;

  const [total, categories]: [number, CategoryRow[]] = await Promise.all([
    prisma.category.count(),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        _count: {
          select: {
            sites: true,
          },
        },
      },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell currentPath="/admin/cats" username={admin.username}>
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Categories</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">分类列表</h2>
        </div>
        <div className="admin-toolbar-meta">
          <span>total {total}</span>
          <span>page {page}/{totalPages}</span>
          <Link className="button-primary" href={buildCatsModalHref(page)}>
            新建分类
          </Link>
        </div>
      </div>

      <section className="list-shell">
        <div className="list-head md:grid-cols-[1.2fr_1fr_120px_120px_120px_220px]">
          <div>名称</div>
          <div>Slug</div>
          <div>颜色</div>
          <div>排序</div>
          <div>站点数</div>
          <div className="text-right">操作</div>
        </div>
        <div>
          {categories.map((category) => (
            <form
              key={category.id}
              action={updateCategory}
              className="list-row md:grid-cols-[1.2fr_1fr_120px_120px_120px_220px]"
            >
              <input type="hidden" name="id" value={category.id} />
              <input className="input" name="name" defaultValue={category.name} required />
              <input className="input" name="slug" defaultValue={category.slug} />
              <div className="flex items-center gap-3">
                <input
                  className="input h-11"
                  name="color"
                  type="color"
                  defaultValue={category.color}
                />
                <span
                  className="inline-dot"
                  style={{ color: category.color, backgroundColor: category.color }}
                />
              </div>
              <input
                className="input"
                name="sortOrder"
                type="number"
                defaultValue={category.sortOrder}
              />
              <div className="text-sm text-[var(--color-muted)]">{category._count.sites}</div>
              <div className="list-actions">
                <button className="button-secondary" type="submit">
                  保存
                </button>
                <button className="button-danger" type="submit" formAction={deleteCategory}>
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
              href={page > 1 ? buildCatsHref(page - 1) : buildCatsHref(1)}
            >
              上一页
            </Link>
            <Link
              className="button-secondary"
              href={page < totalPages ? buildCatsHref(page + 1) : buildCatsHref(totalPages)}
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
                <h3 className="mt-1 text-xl font-semibold">新建分类</h3>
              </div>
              <Link className="button-secondary" href={buildCatsHref(page)}>
                关闭
              </Link>
            </div>
            <form action={createCategory} className="modal-body admin-form-grid">
              <label className="block space-y-2">
                <span className="text-sm font-medium">分类名称</span>
                <input className="input" name="name" placeholder="例如：开发工具" required />
              </label>
              <div className="admin-form-grid-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Slug</span>
                  <input className="input" name="slug" placeholder="development-tools" />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">排序</span>
                  <input className="input" name="sortOrder" type="number" defaultValue="0" />
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium">分类颜色</span>
                <input className="input h-12" name="color" type="color" defaultValue="#4c6fff" />
              </label>
              <div className="flex justify-end gap-2">
                <Link className="button-secondary" href={buildCatsHref(page)}>
                  取消
                </Link>
                <button className="button-primary" type="submit">
                  保存分类
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
