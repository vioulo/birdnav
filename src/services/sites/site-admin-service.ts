import { recordAuditLog } from "@/lib/audit";
import { getActionErrorMessage } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { discoverSiteIconUrl } from "@/lib/site-icon";
import { buildDefaultSiteSlug, createUniqueSiteSlug, isSiteSlugAvailable } from "@/lib/site-slug";

const DEFAULT_SORT_INCREMENT = 10;

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

export function parseBulkSiteLine(line: string) {
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

export function getImportUrlLookupVariants(url: string) {
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

async function getNextSiteSortOrder(increment = DEFAULT_SORT_INCREMENT) {
  const aggregate = await prisma.site.aggregate({
    _max: {
      sortOrder: true,
    },
  });

  return (aggregate._max.sortOrder ?? 0) + increment;
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

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));

  return results;
}

export async function createAdminSite(params: {
  adminId: number;
  catId: number;
  name: string;
  slug?: string;
  url: string;
  iconUrl?: string;
  description?: string;
  featureImage?: string;
  isFeatured: boolean;
  sortOrder: number;
  isPublished: boolean;
  hasManualSortOrder: boolean;
}) {
  const siteSlug = params.slug || (await createUniqueSiteSlug(buildDefaultSiteSlug(params.url)));

  if (params.slug && !(await isSiteSlugAvailable(siteSlug))) {
    throw new Error("站点 Slug 已存在，请换一个。");
  }

  const resolvedIconUrl = params.iconUrl || (await discoverSiteIconUrl(params.url));
  const resolvedSortOrder = params.hasManualSortOrder
    ? params.sortOrder
    : await getNextSiteSortOrder();

  const createdSite = await prisma.site.create({
    data: {
      catId: params.catId,
      name: params.name,
      slug: siteSlug,
      url: params.url,
      iconUrl: resolvedIconUrl,
      description: params.description || null,
      featureImage: params.featureImage || null,
      isFeatured: params.isFeatured,
      sortOrder: resolvedSortOrder,
      isPublished: params.isPublished,
    },
  });

  await recordAuditLog({
    userId: params.adminId,
    action: "site.create",
    targetType: "site",
    targetId: createdSite.id,
    summary: `创建站点 ${createdSite.name}`,
    payload: {
      catId: createdSite.catId,
      slug: createdSite.slug,
      autoDiscoveredIcon: !params.iconUrl && !!createdSite.iconUrl,
      isFeatured: createdSite.isFeatured,
      isPublished: createdSite.isPublished,
    },
  });

  return createdSite;
}

export async function updateAdminSite(params: {
  adminId: number;
  siteId: number;
  catId: number;
  name: string;
  slug?: string;
  url: string;
  iconUrl?: string;
  description?: string;
  featureImage?: string;
  isFeatured: boolean;
  sortOrder: number;
  isPublished: boolean;
}) {
  const siteSlug = params.slug || buildDefaultSiteSlug(params.url);

  if (!(await isSiteSlugAvailable(siteSlug, params.siteId))) {
    throw new Error("站点 Slug 已存在，请换一个。");
  }

  const resolvedIconUrl = params.iconUrl || (await discoverSiteIconUrl(params.url));
  const updatedSite = await prisma.site.update({
    where: { id: params.siteId },
    data: {
      catId: params.catId,
      name: params.name,
      slug: siteSlug,
      url: params.url,
      iconUrl: resolvedIconUrl,
      description: params.description || null,
      featureImage: params.featureImage || null,
      isFeatured: params.isFeatured,
      sortOrder: params.sortOrder,
      isPublished: params.isPublished,
    },
  });

  await recordAuditLog({
    userId: params.adminId,
    action: "site.update",
    targetType: "site",
    targetId: updatedSite.id,
    summary: `更新站点 ${updatedSite.name}`,
    payload: {
      catId: updatedSite.catId,
      slug: updatedSite.slug,
      isFeatured: updatedSite.isFeatured,
      isPublished: updatedSite.isPublished,
    },
  });

  return updatedSite;
}

export async function deleteAdminSite(params: { adminId: number; siteId: number }) {
  const site = await prisma.site.findUnique({
    where: { id: params.siteId },
  });

  if (!site) {
    throw new Error("站点不存在。");
  }

  await prisma.site.delete({
    where: { id: params.siteId },
  });

  await recordAuditLog({
    userId: params.adminId,
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

  return site;
}

export async function bulkImportAdminSites(params: {
  adminId: number;
  catId: number;
  categoryName: string;
  rawLinks: string;
  isPublished: boolean;
  bulkImportLimit: number;
  iconConcurrency: number;
}) {
  const lines = params.rawLinks
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    throw new Error("请至少粘贴 1 个链接。");
  }

  if (lines.length > params.bulkImportLimit) {
    throw new Error(`一次最多导入 ${params.bulkImportLimit} 个链接。`);
  }

  const parsedSites = lines
    .map(parseBulkSiteLine)
    .filter((site): site is { name: string; url: string } => !!site);
  const uniqueSites = Array.from(new Map(parsedSites.map((site) => [site.url, site])).values());

  if (!uniqueSites.length) {
    throw new Error("没有解析到合法链接。");
  }

  const existingSites = await prisma.site.findMany({
    where: {
      url: {
        in: Array.from(new Set(uniqueSites.flatMap((site) => getImportUrlLookupVariants(site.url)))),
      },
    },
    select: { url: true },
  });
  const existingUrls = new Set(existingSites.map((site) => site.url));
  const sitesToCreate = uniqueSites.filter(
    (site) => !getImportUrlLookupVariants(site.url).some((url) => existingUrls.has(url)),
  );

  if (!sitesToCreate.length) {
    return {
      createdCount: 0,
      duplicateCount: uniqueSites.length,
      failedCount: lines.length - parsedSites.length,
      requestedCount: lines.length,
      parsedCount: uniqueSites.length,
      skippedAll: true,
    };
  }

  const reservedSlugs = new Set<string>();
  const sitesWithSlugs = [];
  const firstSortOrder = await getNextSiteSortOrder();

  for (const [index, site] of sitesToCreate.entries()) {
    const slug = await createUniqueSiteSlug(buildDefaultSiteSlug(site.url), reservedSlugs);

    reservedSlugs.add(slug);
    sitesWithSlugs.push({
      ...site,
      slug,
      sortOrder: firstSortOrder + index * DEFAULT_SORT_INCREMENT,
    });
  }

  const preparedSites = await mapWithConcurrency(
    sitesWithSlugs,
    params.iconConcurrency,
    async (site) => ({
      ...site,
      iconUrl: await discoverSiteIconUrl(site.url),
    }),
  );

  const created = await prisma.site.createMany({
    data: preparedSites.map((site) => ({
      catId: params.catId,
      name: site.name.slice(0, 160),
      slug: site.slug,
      url: site.url,
      iconUrl: site.iconUrl,
      sortOrder: site.sortOrder,
      isPublished: params.isPublished,
    })),
    skipDuplicates: true,
  });

  const createdCount = created.count;
  const duplicateCount = uniqueSites.length - sitesToCreate.length;
  const invalidCount = lines.length - parsedSites.length;
  const skippedAfterCreateCount = sitesToCreate.length - createdCount;
  const failedCount = invalidCount + skippedAfterCreateCount;

  await recordAuditLog({
    userId: params.adminId,
    action: "site.bulk_import",
    targetType: "site",
    summary: `批量导入站点 ${createdCount} 个`,
    payload: {
      catId: params.catId,
      categoryName: params.categoryName,
      requestedCount: lines.length,
      parsedCount: uniqueSites.length,
      createdCount,
      duplicateCount,
      failedCount,
      isPublished: params.isPublished,
    },
  });

  return {
    createdCount,
    duplicateCount,
    failedCount,
    requestedCount: lines.length,
    parsedCount: uniqueSites.length,
    skippedAll: false,
  };
}

export function getSiteActionErrorMessage(error: unknown, fallback: string) {
  return getActionErrorMessage(error, fallback);
}
