import Link from "next/link";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/admin/cats/actions";
import {
  PAGE_SIZE,
  buildCategoryWhere,
  buildCatsHref,
  buildCatsModalHref,
  type CategoryRow,
} from "@/app/admin/cats/schema";
import { AdminFeedback } from "@/components/admin-feedback";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ModalEscClose } from "@/components/modal-esc-close";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage({
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
  const categoryWhere = buildCategoryWhere(keyword);

  const [total, categories]: [number, CategoryRow[]] = await Promise.all([
    prisma.category.count({ where: categoryWhere }),
    prisma.category.findMany({
      where: categoryWhere,
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
            {keyword ? <span>filter {keyword}</span> : <span>all records</span>}
          </>
        }
        actions={
          <Link className="button-primary" href={buildCatsModalHref(page, keyword)}>
            新建分类
          </Link>
        }
      />

      <AdminFeedback success={successMessage} error={errorMessage} />

      <section className="admin-record-shell">
        <div className="admin-data-table-toolbar">
          <div>
            <p className="eyebrow">Data Table</p>
            <h3>Category Index</h3>
          </div>
          <form action="/admin/cats" className="admin-data-table-search">
            <input
              className="input admin-data-table-search-input"
              type="search"
              name="q"
              defaultValue={keyword}
              placeholder="关键词筛选分类、slug、颜色..."
            />
            <button className="button-secondary" type="submit">
              筛选
            </button>
            {keyword ? (
              <Link className="button-secondary" href="/admin/cats">
                清除
              </Link>
            ) : null}
          </form>
        </div>
        <div className="admin-data-table-columns is-cat-table">
          <span>分类色块</span>
          <span>分类名称 / Slug</span>
          <span>关联站点</span>
          <span>排序权重</span>
          <span>HEX 色值</span>
          <span>操作</span>
        </div>
        <div className="admin-record-list">
          {categories.length ? (
            categories.map((category) => (
              <details key={category.id} className="admin-record">
                <summary className="admin-record-summary is-cat-row">
                  <span
                    className="admin-category-swatch"
                    style={{ color: category.color, backgroundColor: category.color }}
                    aria-hidden="true"
                  />
                  <span className="admin-record-main">
                    <strong>{category.name}</strong>
                    <span>/{category.slug}</span>
                  </span>
                  <span className="admin-status-pill is-on">
                    {category._count.sites} 个站点
                  </span>
                  <span className="admin-table-cell">权重 {category.sortOrder}</span>
                  <span className="admin-table-cell">{category.color}</span>
                </summary>

                <form action={updateCategoryAction} className="admin-record-editor">
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="page" value={page} />
                  <input type="hidden" name="q" value={keyword} />
                  <div className="admin-edit-grid">
                    <label className="admin-field">
                      <span>分类名称</span>
                      <input className="input" name="name" defaultValue={category.name} required />
                    </label>
                    <label className="admin-field">
                      <span>Slug</span>
                      <input className="input" name="slug" defaultValue={category.slug} />
                    </label>
                    <label className="admin-field">
                      <span>分类颜色</span>
                      <input
                        className="input h-11"
                        name="color"
                        type="color"
                        defaultValue={category.color}
                      />
                    </label>
                    <label className="admin-field">
                      <span>排序</span>
                      <input
                        className="input"
                        name="sortOrder"
                        type="number"
                        defaultValue={category.sortOrder}
                      />
                    </label>
                  </div>
                  <div className="admin-record-actions">
                    <span className="admin-record-hint">
                      当前分类下有 {category._count.sites} 个站点。
                    </span>
                    <div className="list-actions">
                      <button className="button-secondary" type="submit">
                        保存
                      </button>
                      <ConfirmSubmitButton
                        className="button-danger"
                        formAction={deleteCategoryAction}
                        confirmMessage={`确认删除分类“${category.name}”？该分类下的站点也会一起删除。`}
                      >
                        删除
                      </ConfirmSubmitButton>
                    </div>
                  </div>
                </form>
              </details>
            ))
          ) : (
            <div className="empty-state">还没有分类，先创建一个分组。</div>
          )}
        </div>
        {totalPages > 1 ? (
          <div className="pager">
            <p className="pager-meta">
              显示 {skip + 1}-{Math.min(skip + PAGE_SIZE, total)} / {total}
            </p>
            <div className="pager-links">
              <Link
                className={`button-secondary pager-link ${page <= 1 ? "is-disabled" : ""}`}
                href={page > 1 ? buildCatsHref(page - 1, keyword) : buildCatsHref(1, keyword)}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
              >
                上一页
              </Link>
              <Link
                className={`button-secondary pager-link ${page >= totalPages ? "is-disabled" : ""}`}
                href={
                  page < totalPages
                    ? buildCatsHref(page + 1, keyword)
                    : buildCatsHref(totalPages, keyword)
                }
                aria-disabled={page >= totalPages}
                tabIndex={page >= totalPages ? -1 : undefined}
              >
                下一页
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      {isCreateModalOpen ? (
        <div className="modal-overlay">
          <ModalEscClose href={buildCatsHref(page, keyword)} />
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Create</p>
                <h3 className="mt-1 text-xl font-semibold">新建分类</h3>
              </div>
              <Link className="button-secondary" href={buildCatsHref(page, keyword)}>
                关闭
              </Link>
            </div>
            <form action={createCategoryAction} className="modal-body admin-form-grid">
              <input type="hidden" name="page" value={page} />
              <input type="hidden" name="q" value={keyword} />
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
                <Link className="button-secondary" href={buildCatsHref(page, keyword)}>
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
