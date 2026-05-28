import { HomeExperience } from "@/components/home-experience";
import {
  getOptionValue,
  isSiteClickBehavior,
  parseFooterLinks,
  type SiteClickBehavior,
} from "@/lib/options";
import { prisma } from "@/lib/prisma";

type HomeSite = {
  id: number;
  name: string;
  url: string;
  iconUrl: string | null;
  description: string | null;
  featureImage: string | null;
  isFeatured: boolean;
};

type HomeCategory = {
  id: number;
  name: string;
  slug: string;
  color: string;
  sites: HomeSite[];
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params.category?.trim() || "all";
  const search = params.q?.trim() || "";

  const [categories, footerText, footerLinksRaw, clickBehaviorRaw]: [
    HomeCategory[],
    string,
    string,
    string,
  ] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        sites: {
          where: {
            isPublished: true,
          },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          select: {
            id: true,
            name: true,
            url: true,
            iconUrl: true,
            description: true,
            featureImage: true,
            isFeatured: true,
          },
        },
      },
    }),
    getOptionValue("footer.copyright"),
    getOptionValue("footer.links"),
    getOptionValue("site.click_behavior", "detail"),
  ]);

  const clickBehavior: SiteClickBehavior = isSiteClickBehavior(clickBehaviorRaw)
    ? clickBehaviorRaw
    : "detail";
  const footerLinks = parseFooterLinks(footerLinksRaw);
  const visibleCategories = categories.filter((category) => category.sites.length > 0);
  const totalSites = visibleCategories.reduce((sum, category) => sum + category.sites.length, 0);

  const allItems = visibleCategories.flatMap((category) =>
    category.sites.map((site) => ({
      id: site.id,
      name: site.name,
      href: clickBehavior === "detail" ? `/site/${site.id}` : site.url,
      iconUrl: site.iconUrl,
      color: category.color,
      categoryName: category.name,
      categorySlug: category.slug,
      external: clickBehavior === "direct",
      isFeatured: site.isFeatured,
      featureImage: site.featureImage,
      description: site.description,
    })),
  );

  return (
    <div className="flex min-h-screen flex-col text-[var(--color-ink)]">
      <HomeExperience
        categories={visibleCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          color: category.color,
        }))}
        items={allItems}
        initialCategory={selectedCategory}
        initialSearch={search}
        totalSites={totalSites}
      />

      <footer className="site-footer">
        <div className="footer-content">
          <div className="copyright">
            {footerText}
            <br />
            UNIFIED INTERACTION · DUAL THEME
          </div>
          <div className="footer-links">
            {footerLinks.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                target="_blank"
                rel="noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
