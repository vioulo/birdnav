import Link from "next/link";

import { SiteGrid } from "@/components/site-grid";
import { ThemeToggle } from "@/components/theme-toggle";
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

function buildIndexHref(params: { category?: string | null; q?: string | null }) {
  const searchParams = new URLSearchParams();

  if (params.category) {
    searchParams.set("category", params.category);
  }

  if (params.q) {
    searchParams.set("q", params.q);
  }

  const query = searchParams.toString();

  return query ? `/?${query}` : "/";
}

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
  const keyword = search.toLowerCase();
  const totalSites = visibleCategories.reduce((sum, category) => sum + category.sites.length, 0);

  const allItems = visibleCategories.flatMap((category) =>
    category.sites.map((site) => ({
      id: site.id,
      name: site.name,
      href: clickBehavior === "detail" ? `/site/${site.id}` : site.url,
      color: category.color,
      categoryName: category.name,
      categorySlug: category.slug,
      external: clickBehavior === "direct",
      isFeatured: site.isFeatured,
      featureImage: site.featureImage,
      description: site.description,
    })),
  );

  const filteredItems = allItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.categorySlug === selectedCategory;
    const matchesSearch =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.categoryName.toLowerCase().includes(keyword);

    return matchesCategory && matchesSearch;
  });

  const featuredItems = filteredItems.filter(
    (item) => item.isFeatured && item.featureImage,
  );

  const currentPath = buildIndexHref({
    category: selectedCategory === "all" ? null : selectedCategory,
    q: search || null,
  });

  return (
    <div className="min-h-screen text-[var(--color-ink)]">
      <header className="site-header">
        <div className="logo">BIRDNAV</div>
        <form className="search-bar" method="get">
          {selectedCategory !== "all" ? (
            <input type="hidden" name="category" value={selectedCategory} />
          ) : null}
          <input
            name="q"
            defaultValue={search}
            placeholder="SEARCH_KEYWORDS..."
          />
        </form>
        <ThemeToggle redirectTo={currentPath} />
      </header>

      <main className="site-main">
        <section className="categories">
          <Link
            href={buildIndexHref({ category: null, q: search || null })}
            className={`retro-block cat-btn ${selectedCategory === "all" ? "active" : ""}`}
          >
            ALL / 全部
          </Link>
          {visibleCategories.map((category) => (
            <Link
              key={category.id}
              href={buildIndexHref({ category: category.slug, q: search || null })}
              className={`retro-block cat-btn ${selectedCategory === category.slug ? "active" : ""}`}
            >
              {category.slug.toUpperCase()} / {category.name}
            </Link>
          ))}
          <div className="retro-block count-block">
            C-{visibleCategories.length} | S-{totalSites}
          </div>
        </section>

        {featuredItems.length ? (
          <section className="promo-section">
            <span className="promo-tag">A</span>
            <a
              href={featuredItems[0].href}
              target={featuredItems[0].external ? "_blank" : undefined}
              rel={featuredItems[0].external ? "noreferrer" : undefined}
            >
              <h2>{featuredItems[0].name}</h2>
              <p>{featuredItems[0].description || "点击查看详情 →"}</p>
            </a>
          </section>
        ) : null}

        <SiteGrid items={filteredItems} />
      </main>

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
