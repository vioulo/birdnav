import type { Prisma } from "@prisma/client";

export const PAGE_SIZE = 20;
export const BULK_IMPORT_LIMIT = 100;
export const BULK_IMPORT_ICON_CONCURRENCY = 8;

export type SiteRow = {
  id: number;
  catId: number;
  name: string;
  slug: string;
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

export type SiteCategory = {
  id: number;
  name: string;
};

export type SiteFeaturedFilter = "all" | "featured" | "normal";
export type SitePublishedFilter = "all" | "published" | "hidden";

export type SiteFilters = {
  keyword: string;
  categoryId: string;
  featured: SiteFeaturedFilter;
  published: SitePublishedFilter;
};

export const defaultSiteFilters: SiteFilters = {
  keyword: "",
  categoryId: "all",
  featured: "all",
  published: "all",
};

export function normalizeFeaturedFilter(
  value: FormDataEntryValue | string | null | undefined,
): SiteFeaturedFilter {
  return value === "featured" || value === "normal" ? value : "all";
}

export function normalizePublishedFilter(
  value: FormDataEntryValue | string | null | undefined,
): SitePublishedFilter {
  return value === "published" || value === "hidden" ? value : "all";
}

export function readSiteFiltersFromForm(formData: FormData): SiteFilters {
  return {
    keyword: String(formData.get("q") || "").trim(),
    categoryId: String(formData.get("filterCatId") || "all"),
    featured: normalizeFeaturedFilter(formData.get("featured")),
    published: normalizePublishedFilter(formData.get("published")),
  };
}

export function readSiteFiltersFromSearchParams(params: {
  q?: string;
  cat?: string;
  featured?: string;
  published?: string;
}) {
  return {
    keyword: params.q?.trim() || "",
    categoryId: params.cat?.trim() || "all",
    featured: normalizeFeaturedFilter(params.featured),
    published: normalizePublishedFilter(params.published),
  };
}

export function appendSiteFilters(searchParams: URLSearchParams, filters: SiteFilters) {
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

export function buildSitesHref(page: number, filters: SiteFilters = defaultSiteFilters) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  appendSiteFilters(searchParams, filters);

  const query = searchParams.toString();
  return query ? `/admin/sites?${query}` : "/admin/sites";
}

export function buildSitesModalHref(page: number, filters: SiteFilters = defaultSiteFilters) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  appendSiteFilters(searchParams, filters);
  searchParams.set("modal", "new");
  return `/admin/sites?${searchParams.toString()}`;
}

export function buildSitesBulkModalHref(page: number, filters: SiteFilters = defaultSiteFilters) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  appendSiteFilters(searchParams, filters);
  searchParams.set("modal", "bulk");
  return `/admin/sites?${searchParams.toString()}`;
}

export function buildSitesFeedbackHref(
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

export function buildSiteWhere(filters: SiteFilters): Prisma.SiteWhereInput {
  const keyword = filters.keyword;
  const selectedCategoryId = filters.categoryId !== "all" ? Number(filters.categoryId) : null;

  return {
    ...(keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { slug: { contains: keyword } },
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
}
