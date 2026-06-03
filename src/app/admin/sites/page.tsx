import Link from "next/link";
import { X } from "lucide-react";

import {
  bulkImportSitesAction,
  createSiteAction,
  deleteSiteAction,
  updateSiteAction,
} from "@/app/admin/sites/actions";
import {
  BULK_IMPORT_LIMIT,
  PAGE_SIZE,
  buildSiteWhere,
  buildSitesBulkModalHref,
  buildSitesHref,
  buildSitesModalHref,
  readSiteFiltersFromSearchParams,
  type SiteCategory,
  type SiteFilters,
  type SiteRow,
} from "@/app/admin/sites/schema";
import { AdminFeedback } from "@/components/admin-feedback";
import { AdminPageHeader } from "@/components/admin-page-header";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ModalEscClose } from "@/components/modal-esc-close";
import { SubmitButton } from "@/components/submit-button";
import { SiteIcon } from "@/components/site-icon";
import { prisma } from "@/lib/prisma";

export default async function AdminSitesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    modal?: string;
    success?: string;
    error?: string;
    q?: string;
    cat?: string;
    featured?: string;
    published?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1") || 1);
  const isCreateModalOpen = params.modal === "new";
  const isBulkModalOpen = params.modal === "bulk";
  const successMessage = params.success?.trim();
  const errorMessage = params.error?.trim();
  const filters: SiteFilters = readSiteFiltersFromSearchParams(params);
  const keyword = filters.keyword;
  const skip = (page - 1) * PAGE_SIZE;
  const siteWhere = buildSiteWhere(filters);

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
  const activeFilterCount = [
    filters.keyword,
    filters.categoryId !== "all",
    filters.featured !== "all",
    filters.published !== "all",
  ].filter(Boolean).length;

  return (
    <>
      <AdminPageHeader
        eyebrow="Sites"
        title="站点列表"
        description="默认展示核心信息，展开后再编辑，避免列表被表单噪音淹没。"
        meta={
          <>
            <span>total {total}</span>
            <span>page {page}/{totalPages}</span>
            {activeFilterCount ? <span>{activeFilterCount} filters</span> : <span>all records</span>}
          </>
        }
        actions={
          <div className="list-actions">
            <Link className="button-secondary" href={buildSitesBulkModalHref(page, filters)}>
              批量导入
            </Link>
            <Link className="button-primary" href={buildSitesModalHref(page, filters)}>
              新建站点
            </Link>
          </div>
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
              placeholder="关键词筛选名称、Slug、链接、描述..."
            />
            <select
              className="input admin-data-table-filter-select is-category"
              name="cat"
              defaultValue={filters.categoryId}
            >
              <option value="all">全部分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              className="input admin-data-table-filter-select"
              name="featured"
              defaultValue={filters.featured}
            >
              <option value="all">全部推广</option>
              <option value="featured">已推广</option>
              <option value="normal">未推广</option>
            </select>
            <select
              className="input admin-data-table-filter-select"
              name="published"
              defaultValue={filters.published}
            >
              <option value="all">全部发布</option>
              <option value="published">已发布</option>
              <option value="hidden">已隐藏</option>
            </select>
            <button className="button-secondary" type="submit">
              筛选
            </button>
            {activeFilterCount ? (
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
                    <SiteIcon
                      src={site.iconUrl}
                      label={site.name}
                      alt={site.name}
                      imgClassName=""
                      fallbackClassName=""
                    />
                  </span>
                  <span className="admin-record-main">
                    <strong>{site.name}</strong>
                    <span>{site.url}</span>
                    <span>/site/{site.slug}</span>
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

                <form action={updateSiteAction} className="admin-record-editor">
                  <input type="hidden" name="id" value={site.id} />
                  <input type="hidden" name="page" value={page} />
                  <input type="hidden" name="q" value={keyword} />
                  <input type="hidden" name="filterCatId" value={filters.categoryId} />
                  <input type="hidden" name="featured" value={filters.featured} />
                  <input type="hidden" name="published" value={filters.published} />
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
                      <span>详情 Slug</span>
                      <input
                        className="input"
                        name="slug"
                        defaultValue={site.slug}
                        placeholder="github.com"
                        required
                      />
                    </label>
                    <label className="admin-field">
                      <span>站点 Icon</span>
                      <input
                        className="input"
                        name="iconUrl"
                        defaultValue={site.iconUrl || ""}
                        placeholder="留空自动尝试抓取"
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
                      <SubmitButton className="button-secondary" loadingText="保存中...">
                        保存
                      </SubmitButton>
                      <ConfirmSubmitButton
                        className="button-danger"
                        formAction={deleteSiteAction}
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
        {totalPages > 1 ? (
          <div className="pager">
            <p className="pager-meta">
              显示 {skip + 1}-{Math.min(skip + PAGE_SIZE, total)} / {total}
            </p>
            <div className="pager-links">
              <Link
                className={`button-secondary pager-link ${page <= 1 ? "is-disabled" : ""}`}
                href={page > 1 ? buildSitesHref(page - 1, filters) : buildSitesHref(1, filters)}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
              >
                上一页
              </Link>
              <Link
                className={`button-secondary pager-link ${page >= totalPages ? "is-disabled" : ""}`}
                href={
                  page < totalPages
                    ? buildSitesHref(page + 1, filters)
                    : buildSitesHref(totalPages, filters)
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
          <ModalEscClose href={buildSitesHref(page, filters)} />
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Create</p>
                <h3 className="mt-1 text-xl font-semibold">新建站点</h3>
              </div>
              <Link
                className="button-secondary"
                href={buildSitesHref(page, filters)}
                aria-label="关闭"
              >
                <X aria-hidden="true" />
              </Link>
            </div>
            <form action={createSiteAction} className="modal-body admin-form-grid">
              <input type="hidden" name="page" value={page} />
              <input type="hidden" name="q" value={keyword} />
              <input type="hidden" name="filterCatId" value={filters.categoryId} />
              <input type="hidden" name="featured" value={filters.featured} />
              <input type="hidden" name="published" value={filters.published} />
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
                  <input
                    className="input"
                    name="sortOrder"
                    type="number"
                    placeholder="留空自动追加"
                  />
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
                <span className="text-sm font-medium">详情 Slug</span>
                <input
                  className="input"
                  name="slug"
                  placeholder="留空默认使用主域名，例如 github.com"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">站点 Icon</span>
                <input className="input" name="iconUrl" placeholder="可选，留空自动尝试抓取" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">简介</span>
                <textarea
                  className="input min-h-24 resize-y"
                  name="description"
                  placeholder="留空自动抓取站点描述"
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
                <Link className="button-secondary" href={buildSitesHref(page, filters)}>
                  取消
                </Link>
                <SubmitButton className="button-primary" loadingText="保存中...">
                  保存站点
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isBulkModalOpen ? (
        <div className="modal-overlay">
          <ModalEscClose href={buildSitesHref(page, filters)} />
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Bulk Import</p>
                <h3 className="mt-1 text-xl font-semibold">批量导入站点</h3>
              </div>
              <Link
                className="button-secondary"
                href={buildSitesHref(page, filters)}
                aria-label="关闭"
              >
                <X aria-hidden="true" />
              </Link>
            </div>
            <form action={bulkImportSitesAction} className="modal-body admin-form-grid">
              <input type="hidden" name="page" value={page} />
              <input type="hidden" name="q" value={keyword} />
              <input type="hidden" name="filterCatId" value={filters.categoryId} />
              <input type="hidden" name="featured" value={filters.featured} />
              <input type="hidden" name="published" value={filters.published} />
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
                <label className="flex items-center gap-2 self-end text-sm">
                  <input name="isPublished" type="checkbox" defaultChecked />
                  前台显示
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium">链接列表</span>
                <textarea
                  className="input min-h-72 resize-y"
                  name="links"
                  placeholder={`每行一个链接，最多 ${BULK_IMPORT_LIMIT} 个\nhttps://github.com\nOpenAI|https://openai.com`}
                  required
                />
              </label>
              <p className="admin-record-hint">
                支持纯链接或 名称|链接。纯链接会自动用域名生成名称，并尝试抓取站点 icon。
              </p>
              <div className="flex justify-end gap-2">
                <Link className="button-secondary" href={buildSitesHref(page, filters)}>
                  取消
                </Link>
                <SubmitButton className="button-primary" loadingText="导入中...">
                  开始导入
                </SubmitButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
