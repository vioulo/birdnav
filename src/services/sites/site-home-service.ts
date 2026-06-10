import type { Prisma } from "@prisma/client";

import type { SiteClickBehavior } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { appendUtmSource } from "@/lib/utils";

export type HomeCategory = {
  id: number;
  name: string;
  slug: string;
  color: string;
  publishedSiteCount: number;
};

export type HomeApplyCategory = {
  id: number;
  name: string;
};

export type HomeSiteItem = {
  id: number;
  name: string;
  href: string;
  iconUrl: string | null;
  color: string;
  categoryName: string;
  categorySlug: string;
  external: boolean;
  isFeatured: boolean;
  featureImage: string | null;
  description: string | null;
};

type HomeSiteQueryParams = {
  categorySlug: string;
  search: string;
  clickBehavior: SiteClickBehavior;
  utmSource: string;
};

function buildHomeSiteWhere(params: Pick<HomeSiteQueryParams, "categorySlug" | "search">) {
  const where: Prisma.SiteWhereInput = {
    isPublished: true,
  };

  if (params.categorySlug !== "all") {
    where.category = {
      slug: params.categorySlug,
    };
  }

  if (params.search) {
    where.OR = [
      {
        name: {
          contains: params.search,
        },
      },
      {
        description: {
          contains: params.search,
        },
      },
      {
        category: {
          name: {
            contains: params.search,
          },
        },
      },
    ];
  }

  return where;
}

function getHomeSiteOrderBy(): Prisma.SiteOrderByWithRelationInput[] {
  return [
    {
      sortOrder: "asc",
    },
    {
      id: "asc",
    },
  ];
}

function mapHomeSiteItem(
  site: {
    id: number;
    name: string;
    slug: string;
    url: string;
    iconUrl: string | null;
    description: string | null;
    featureImage: string | null;
    isFeatured: boolean;
    category: {
      name: string;
      slug: string;
      color: string;
    };
  },
  params: Pick<HomeSiteQueryParams, "clickBehavior" | "utmSource">,
): HomeSiteItem {
  const external = params.clickBehavior === "direct";

  return {
    id: site.id,
    name: site.name,
    href: external ? appendUtmSource(site.url, params.utmSource) : `/site/${site.slug}`,
    iconUrl: site.iconUrl,
    color: site.category.color,
    categoryName: site.category.name,
    categorySlug: site.category.slug,
    external,
    isFeatured: site.isFeatured,
    featureImage: site.featureImage,
    description: site.description,
  };
}

export async function getHomeCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      _count: {
        select: {
          sites: {
            where: {
              isPublished: true,
            },
          },
        },
      },
    },
  });

  return categories.map<HomeCategory>((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    color: category.color,
    publishedSiteCount: category._count.sites,
  }));
}

export async function getHomeApplyCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
    },
  });

  return categories.map<HomeApplyCategory>((category) => ({
    id: category.id,
    name: category.name,
  }));
}

export async function getHomeSitesPage(
  params: HomeSiteQueryParams & {
    page: number;
    pageSize: number;
  },
) {
  const where = buildHomeSiteWhere(params);
  const skip = (params.page - 1) * params.pageSize;

  const [total, sites] = await Promise.all([
    prisma.site.count({ where }),
    prisma.site.findMany({
      where,
      orderBy: getHomeSiteOrderBy(),
      skip,
      take: params.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        url: true,
        iconUrl: true,
        description: true,
        featureImage: true,
        isFeatured: true,
        category: {
          select: {
            name: true,
            slug: true,
            color: true,
          },
        },
      },
    }),
  ]);

  return {
    total,
    items: sites.map((site) => mapHomeSiteItem(site, params)),
  };
}

export async function getHomeFeaturedItems(
  params: HomeSiteQueryParams & {
    featuredLimit: number;
  },
) {
  if (params.featuredLimit < 1) {
    return [];
  }

  const sites = await prisma.site.findMany({
    where: {
      ...buildHomeSiteWhere(params),
      isFeatured: true,
    },
    orderBy: getHomeSiteOrderBy(),
    take: params.featuredLimit,
    select: {
      id: true,
      name: true,
      slug: true,
      url: true,
      iconUrl: true,
      description: true,
      featureImage: true,
      isFeatured: true,
      category: {
        select: {
          name: true,
          slug: true,
          color: true,
        },
      },
    },
  });

  return sites.map((site) => mapHomeSiteItem(site, params));
}

export function readPositiveInteger(input: string | null | undefined, fallback: number, max: number) {
  const value = Number.parseInt(input || "", 10);

  if (!Number.isFinite(value) || value < 1) {
    return fallback;
  }

  return Math.min(value, max);
}

export function readNonNegativeInteger(
  input: string | null | undefined,
  fallback: number,
  max: number,
) {
  const value = Number.parseInt(input || "", 10);

  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.min(value, max);
}
