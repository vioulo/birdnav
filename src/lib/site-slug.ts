import { prisma } from "@/lib/prisma";
import { inferSiteSlugFromUrl, slugifySite } from "@/lib/utils";

export function buildDefaultSiteSlug(url: string) {
  return inferSiteSlugFromUrl(url) || "site";
}

export async function createUniqueSiteSlug(baseSlug: string, reservedSlugs = new Set<string>()) {
  const normalizedBase = slugifySite(baseSlug) || "site";
  const existingSites = await prisma.site.findMany({
    where: {
      OR: [
        { slug: normalizedBase },
        { slug: { startsWith: `${normalizedBase}-` } },
      ],
    },
    select: {
      slug: true,
    },
  });
  const usedSlugs = new Set([
    ...existingSites.map((site) => site.slug),
    ...reservedSlugs,
  ]);

  if (!usedSlugs.has(normalizedBase)) {
    return normalizedBase;
  }

  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const candidate = `${normalizedBase}-${suffix}`;

    if (!usedSlugs.has(candidate)) {
      return candidate;
    }
  }

  return `${normalizedBase}-${Date.now()}`;
}

export async function isSiteSlugAvailable(slug: string, ignoredSiteId?: number) {
  const normalizedSlug = slugifySite(slug) || "site";
  const existingSite = await prisma.site.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  return !existingSite || existingSite.id === ignoredSiteId;
}
