import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { AdminFeedback } from "@/components/admin-feedback";
import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ModalEscClose } from "@/components/modal-esc-close";
import { requireAdmin } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { getActionErrorMessage } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { discoverSiteIconUrl } from "@/lib/site-icon";
import { parseSiteForm } from "@/lib/validation";

const PAGE_SIZE = 10;
const BULK_IMPORT_LIMIT = 100;
const BULK_IMPORT_ICON_CONCURRENCY = 8;

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

type SiteFeaturedFilter = "all" | "featured" | "normal";
type SitePublishedFilter = "all" | "published" | "hidden";

type SiteFilters = {
  keyword: string;
  categoryId: string;
  featured: SiteFeaturedFilter;
  published: SitePublishedFilter;
};

const defaultSiteFilters: SiteFilters = {
  keyword: "",
  categoryId: "all",
  featured: "all",
  published: "all",
};

function normalizeFeaturedFilter(value: FormDataEntryValue | string | null | undefined): SiteFeaturedFilter {
  return value === "featured" || value === "normal" ? value : "all";
}

function normalizePublishedFilter(value: FormDataEntryValue | string | null | undefined): SitePublishedFilter {
  return value === "published" || value === "hidden" ? value : "all";
}

function readSiteFiltersFromForm(formData: FormData): SiteFilters {
  return {
    keyword: String(formData.get("q") || "").trim(),
    categoryId: String(formData.get("filterCatId") || "all"),
    featured: normalizeFeaturedFilter(formData.get("featured")),
    published: normalizePublishedFilter(formData.get("published")),
  };
}

function appendSiteFilters(searchParams: URLSearchParams, filters: SiteFilters) {
  if (filters.keyword) {
    searchParams.set("q", filters.keyword);
  }

  if (filters.categoryId !== "all") {
    searchParams.set("cat", filters.categoryId);
  }

  if (filters.featured !== "all") {
    searchParams.set("featured", filters.featured);
  }

  if (filters.published !== "all") {
    searchParams.set("published", filters.published);
  }
}

function buildSitesHref(page: number, filters: SiteFilters = defaultSiteFilters) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  appendSiteFilters(searchParams, filters);

  const query = searchParams.toString();
  return query ? `/admin/sites?${query}` : "/admin/sites";
}

function buildSitesModalHref(page: number, filters: SiteFilters = defaultSiteFilters) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  appendSiteFilters(searchParams, filters);

  searchParams.set("modal", "new");
  return `/admin/sites?${searchParams.toString()}`;
}

function buildSitesBulkModalHref(page: number, filters: SiteFilters = defaultSiteFilters) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  appendSiteFilters(searchParams, filters);

  searchParams.set("modal", "bulk");
  return `/admin/sites?${searchParams.toString()}`;
}

function buildSitesFeedbackHref(
  page: number,
  type: "success" | "error",
  message: string,
  modal?: "new" | "bulk",
  filters: SiteFilters = defaultSiteFilters,
) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  appendSiteFilters(searchParams, filters);

  if (modal) {
    searchParams.set("modal", modal);
  }

  searchParams.set(type, message);
  return `/admin/sites?${searchParams.toString()}`;
}

function normalizeImportUrl(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function inferSiteName(url: string) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    const [label] = hostname.split(".");

    return label
      ? label
          .split(/[-_]/)
          .filter(Boolean)
          .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
          .join(" ")
      : hostname;
  } catch {
    return url;
  }
}

function parseBulkSiteLine(line: string) {
  const normalized = line.trim();

  if (!normalized) {
    return null;
  }

  const [namePart, urlPart] = normalized.includes("|")
    ? normalized.split("|", 2).map((part) => part.trim())
    : ["", normalized];
  const url = normalizeImportUrl(urlPart || namePart);

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return null;
    }

    parsedUrl.hash = "";
    const normalizedUrl =
      parsedUrl.pathname === "/" && !parsedUrl.search ? parsedUrl.origin : parsedUrl.toString();

    return {
      name: (urlPart ? namePart : "") || inferSiteName(normalizedUrl),
      url: normalizedUrl,
    };
  } catch {
    return null;
  }
}

function getImportUrlLookupVariants(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.pathname === "/" && !parsedUrl.search) {
      return [parsedUrl.origin, `${parsedUrl.origin}/`];
    }
  } catch {
    // Fall back to exact matching for malformed values already filtered elsewhere.
  }

  return [url];
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

async function createSite(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const filters = readSiteFiltersFromForm(formData);

  const parsed = parseSiteForm(formData);

  if (!parsed.success) {
    redirect(
      buildSitesFeedbackHref(
        1,
        "error",
        parsed.error.issues[0]?.message || "站点信息无效。",
        "new",
        filters,
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
        filters,
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
      autoDiscoveredIcon: !iconUrl && !!createdSite.iconUrl,
      isFeatured: createdSite.isFeatured,
      isPublished: createdSite.isPublished,
    },
  });

  redirect(buildSitesFeedbackHref(page, "success", "站点创建成功。", undefined, filters));
}

async function bulkImportSites(formData: FormData) {
  "use server";

  const admin = await requireAdmin();
  const page = Math.max(1, Number(formData.get("page") || 1));
  const filters = readSiteFiltersFromForm(formData);
  const catId = Number(formData.get("catId"));
  const rawLinks = String(formData.get("links") || "");
  const isPublished = formData.get("isPublished") === "on";

  if (!catId) {
    redirect(buildSitesFeedbackHref(page, "error", "请选择批量导入分类。", "bulk", filters));
  }

  const category = await prisma.category.findUnique({
    where: { id: catId },
    select: { id: true, name: true },
  });

  if (!category) {
    redirect(buildSitesFeedbackHref(page, "error", "分类不存在。", "bulk", filters));
  }

  const lines = rawLinks
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    redirect(buildSitesFeedbackHref(page, "error", "请至少粘贴 1 个链接。", "bulk", filters));
  }

  if (lines.length > BULK_IMPORT_LIMIT) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        `一次最多导入 ${BULK_IMPORT_LIMIT} 个链接。`,
        "bulk",
        filters,
      ),
    );
  }

  const parsedSites = lines
    .map(parseBulkSiteLine)
    .filter((site): site is { name: string; url: string } => !!site);
  const uniqueSites = Array.from(
    new Map(parsedSites.map((site) => [site.url, site])).values(),
  );

  if (!uniqueSites.length) {
    redirect(buildSitesFeedbackHref(page, "error", "没有解析到合法链接。", "bulk", filters));
  }

  const existingSites = await prisma.site.findMany({
    where: {
      url: {
        in: Array.from(
          new Set(uniqueSites.flatMap((site) => getImportUrlLookupVariants(site.url))),
        ),
      },
    },
    select: { url: true },
  });
  const existingUrls = new Set(existingSites.map((site) => site.url));
  const sitesToCreate = uniqueSites.filter(
    (site) => !getImportUrlLookupVariants(site.url).some((url) => existingUrls.has(url)),
  );

  if (!sitesToCreate.length) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "success",
        `没有新增站点，已跳过 ${uniqueSites.length} 个重复链接。`,
        undefined,
        filters,
      ),
    );
  }

  let preparedSites: Array<{ name: string; url: string; iconUrl: string | null }>;

  try {
    preparedSites = await mapWithConcurrency(
      sitesToCreate,
      BULK_IMPORT_ICON_CONCURRENCY,
      async (site) => ({
        ...site,
        iconUrl: await discoverSiteIconUrl(site.url),
      }),
    );
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getActionErrorMessage(error, "批量获取图标失败。"),
        "bulk",
        filters,
      ),
    );
  }

  let createdCount = 0;

  try {
    const created = await prisma.site.createMany({
      data: preparedSites.map((site) => ({
        catId,
        name: site.name.slice(0, 160),
        url: site.url,
        iconUrl: site.iconUrl,
        isPublished,
      })),
      skipDuplicates: true,
    });

    createdCount = created.count;
  } catch (error) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        getActionErrorMessage(error, "批量导入站点失败。"),
        "bulk",
        filters,
      ),
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/sites");
  revalidatePath("/");

  const duplicateCount = uniqueSites.length - sitesToCreate.length;
  const invalidCount = lines.length - parsedSites.length;
  const skippedAfterCreateCount = sitesToCreate.length - createdCount;
  const failedCount = invalidCount + skippedAfterCreateCount;

  await recordAuditLog({
    userId: admin.id,
    action: "site.bulk_import",
    targetType: "site",
    summary: `批量导入站点 ${createdCount} 个`,
    payload: {
      catId,
      categoryName: category.name,
      requestedCount: lines.length,
      parsedCount: uniqueSites.length,
      createdCount,
      duplicateCount,
      failedCount,
      isPublished,
    },
  });

  redirect(
    buildSitesFeedbackHref(
      page,
      "success",
      `批量导入完成：新增 ${createdCount} 个，跳过重复 ${duplicateCount} 个，失败 ${failedCount} 个。`,
      undefined,
      filters,
    ),
  );
}

async function updateSite(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const filters = readSiteFiltersFromForm(formData);
  const parsed = parseSiteForm(formData);

  if (!id || !parsed.success) {
    redirect(
      buildSitesFeedbackHref(
        page,
        "error",
        parsed.success ? "站点不存在。" : parsed.error.issues[0]?.message || "站点信息无效。",
        undefined,
        filters,
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
    const resolvedIconUrl = iconUrl || await discoverSiteIconUrl(url);

    updatedSite = await prisma.site.update({
      where: { id },
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
        getActionErrorMessage(error, "保存站点失败。"),
        undefined,
        filters,
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

  redirect(buildSitesFeedbackHref(page, "success", "站点保存成功。", undefined, filters));
}

async function deleteSite(formData: FormData) {
  "use server";

  const admin = await requireAdmin();

  const id = Number(formData.get("id"));
  const page = Math.max(1, Number(formData.get("page") || 1));
  const filters = readSiteFiltersFromForm(formData);

  if (!id) {
    redirect(buildSitesFeedbackHref(page, "error", "站点不存在。", undefined, filters));
  }

  const site = await prisma.site.findUnique({
    where: { id },
  });

  if (!site) {
    redirect(buildSitesFeedbackHref(page, "error", "站点不存在。", undefined, filters));
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
        filters,
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

  redirect(buildSitesFeedbackHref(page, "success", "站点删除成功。", undefined, filters));
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
    cat?: string;
    featured?: string;
    published?: string;
  }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1") || 1);
  const isCreateModalOpen = params.modal === "new";
  const isBulkModalOpen = params.modal === "bulk";
  const successMessage = params.success?.trim();
  const errorMessage = params.error?.trim();
  const filters: SiteFilters = {
    keyword: params.q?.trim() || "",
    categoryId: params.cat?.trim() || "all",
    featured: normalizeFeaturedFilter(params.featured),
    published: normalizePublishedFilter(params.published),
  };
  const keyword = filters.keyword;
  const selectedCategoryId = filters.categoryId !== "all" ? Number(filters.categoryId) : null;
  const skip = (page - 1) * PAGE_SIZE;
  const siteWhere: Prisma.SiteWhereInput = {
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { url: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        }
      : {}),
    ...(selectedCategoryId ? { catId: selectedCategoryId } : {}),
    ...(filters.featured === "featured" ? { isFeatured: true } : {}),
    ...(filters.featured === "normal" ? { isFeatured: false } : {}),
    ...(filters.published === "published" ? { isPublished: true } : {}),
    ...(filters.published === "hidden" ? { isPublished: false } : {}),
  };

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
    <AdminShell currentPath="/admin/sites" username={admin.username}>
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
              placeholder="关键词筛选名称、链接、描述..."
            />
            <select className="input admin-data-table-filter-select is-category" name="cat" defaultValue={filters.categoryId}>
              <option value="all">全部分类</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select className="input admin-data-table-filter-select" name="featured" defaultValue={filters.featured}>
              <option value="all">全部推广</option>
              <option value="featured">已推广</option>
              <option value="normal">未推广</option>
            </select>
            <select className="input admin-data-table-filter-select" name="published" defaultValue={filters.published}>
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
              href={page > 1 ? buildSitesHref(page - 1, filters) : buildSitesHref(1, filters)}
            >
              上一页
            </Link>
            <Link
              className="button-secondary"
              href={
                page < totalPages
                  ? buildSitesHref(page + 1, filters)
                  : buildSitesHref(totalPages, filters)
              }
            >
              下一页
            </Link>
          </div>
        </div>
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
              <Link className="button-secondary" href={buildSitesHref(page, filters)}>
                关闭
              </Link>
            </div>
            <form action={createSite} className="modal-body admin-form-grid">
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
                <input className="input" name="iconUrl" placeholder="可选，留空自动尝试抓取" />
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
                <Link className="button-secondary" href={buildSitesHref(page, filters)}>
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

      {isBulkModalOpen ? (
        <div className="modal-overlay">
          <ModalEscClose href={buildSitesHref(page, filters)} />
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Bulk Import</p>
                <h3 className="mt-1 text-xl font-semibold">批量导入站点</h3>
              </div>
              <Link className="button-secondary" href={buildSitesHref(page, filters)}>
                关闭
              </Link>
            </div>
            <form action={bulkImportSites} className="modal-body admin-form-grid">
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
                <button className="button-primary" type="submit">
                  开始导入
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
