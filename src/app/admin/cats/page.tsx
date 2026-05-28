import Link from "next/link";
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
import { slugify } from "@/lib/utils";
import { parseCategoryForm } from "@/lib/validation";

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

function buildCatsFeedbackHref(
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
  const query = searchParams.toString();

  return query ? `/admin/cats?${query}` : "/admin/cats";
}

async function createCategory(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const parsed = parseCategoryForm(formData);

  if (!parsed.success) {
    redirect(
      buildCatsFeedbackHref(
        1,
        "error",
        parsed.error.issues[0]?.message || "分类信息无效。",
        "new",
      ),
    );
  }

  const { name, slug: slugInput, color, sortOrder, page } = parsed.data;
  const slug = slugify(slugInput || name);

  let createdCategory;

  try {
    createdCategory = await prisma.category.create({
      data: {
        name,
        slug,
        color,
        sortOrder,
      },
    });
  } catch (error) {
    redirect(
      buildCatsFeedbackHref(
        page,
        "error",
        getActionErrorMessage(error, "创建分类失败。"),
        "new",
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/cats");
  revalidatePath("/admin/sites");
  revalidatePath("/");

  await recordAuditLog({
    userId: admin.id,
    action: "category.create",
    targetType: "category",
    targetId: createdCategory.id,
    summary: `创建分类 ${createdCategory.name}`,
    payload: {
      slug: createdCategory.slug,
      color: createdCategory.color,
      sortOrder: createdCategory.sortOrder,
    },
  });

  redirect(buildCatsFeedbackHref(page, "success", "分类创建成功。"));
}

async function updateCategory(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const parsed = parseCategoryForm(formData);

  if (!id || !parsed.success) {
    redirect(
      buildCatsFeedbackHref(
        page,
        "error",
        parsed.success ? "分类不存在。" : parsed.error.issues[0]?.message || "分类信息无效。",
      ),
    );
  }

  const { name, slug: slugInput, color, sortOrder } = parsed.data;
  const slug = slugify(slugInput || name);

  let updatedCategory;

  try {
    updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        color,
        sortOrder,
      },
    });
  } catch (error) {
    redirect(
      buildCatsFeedbackHref(
        page,
        "error",
        getActionErrorMessage(error, "保存分类失败。"),
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/cats");
  revalidatePath("/admin/sites");
  revalidatePath("/");

  await recordAuditLog({
    userId: admin.id,
    action: "category.update",
    targetType: "category",
    targetId: updatedCategory.id,
    summary: `更新分类 ${updatedCategory.name}`,
    payload: {
      slug: updatedCategory.slug,
      color: updatedCategory.color,
      sortOrder: updatedCategory.sortOrder,
    },
  });

  redirect(buildCatsFeedbackHref(page, "success", "分类保存成功。"));
}

async function deleteCategory(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));

  if (!id) {
    redirect(buildCatsFeedbackHref(page, "error", "分类不存在。"));
  }

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          sites: true,
        },
      },
    },
  });

  if (!category) {
    redirect(buildCatsFeedbackHref(page, "error", "分类不存在。"));
  }

  try {
    await prisma.category.delete({
      where: { id },
    });
  } catch (error) {
    redirect(
      buildCatsFeedbackHref(
        page,
        "error",
        getActionErrorMessage(error, "删除分类失败。"),
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/cats");
  revalidatePath("/admin/sites");
  revalidatePath("/");

  await recordAuditLog({
    userId: admin.id,
    action: "category.delete",
    targetType: "category",
    targetId: category.id,
    summary: `删除分类 ${category.name}`,
    payload: {
      slug: category.slug,
      siteCount: category._count.sites,
    },
  });

  redirect(buildCatsFeedbackHref(page, "success", "分类及其下属站点已删除。"));
}

export default async function AdminCategoriesPage({
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
      <AdminPageHeader
        eyebrow="Categories"
        title="分类列表"
        description="管理前台筛选入口和链接色块，保持分类数量清晰可控。"
        meta={
          <>
            <span>total {total}</span>
            <span>page {page}/{totalPages}</span>
          </>
        }
        actions={
          <Link className="button-primary" href={buildCatsModalHref(page)}>
            新建分类
          </Link>
        }
      />

      <AdminFeedback success={successMessage} error={errorMessage} />

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
              <input type="hidden" name="page" value={page} />
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
                <ConfirmSubmitButton
                  className="button-danger"
                  formAction={deleteCategory}
                  confirmMessage={`确认删除分类“${category.name}”？该分类下的站点也会一起删除。`}
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
              <input type="hidden" name="page" value={page} />
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
