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
  const selectedCategory = params.category?.trim() || null;
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
  const visibleCategories = categories.filter(
    (category: HomeCategory) => category.sites.length > 0,
  );
  const filteredCategories = visibleCategories
    .map((category: HomeCategory) => {
      const matchesCategory = !selectedCategory || category.slug === selectedCategory;
      const filteredSites = category.sites.filter((site: HomeSite) => {
        const keyword = search.toLowerCase();
        const matchesSearch =
          !keyword ||
          site.name.toLowerCase().includes(keyword) ||
          (site.description || "").toLowerCase().includes(keyword) ||
          site.url.toLowerCase().includes(keyword) ||
          category.name.toLowerCase().includes(keyword);

        return matchesCategory && matchesSearch;
      });

      return {
        ...category,
        sites: filteredSites,
      };
    })
    .filter((category: HomeCategory) => category.sites.length > 0);

  const totalSites = visibleCategories.reduce(
    (sum: number, category: HomeCategory) => sum + category.sites.length,
    0,
  );
  const filteredSites = filteredCategories.flatMap((category: HomeCategory) =>
    category.sites.map((site: HomeSite) => ({
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
  const featuredSites = filteredSites.filter(
    (site) => site.isFeatured && site.featureImage,
  );
  const currentPath = buildIndexHref({ category: selectedCategory, q: search || null });

  return (
    <div className="min-h-screen text-[var(--color-ink)]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-3 py-3 md:px-4 md:py-4">
        <header className="tech-panel-strong overflow-hidden">
          <div className="grid gap-2 px-4 py-3 md:grid-cols-[180px_minmax(0,1fr)_auto_auto] md:items-center">
            <div className="min-w-0 border-b border-[var(--color-line)] pb-2 md:border-b-0 md:pb-0">
              <p className="eyebrow">BirdNav Index</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">BirdNav</h1>
            </div>
            <form
              className="tech-search-wrap flex items-center gap-2 border-b border-[var(--color-line)] pb-2 md:border-b-0 md:pb-0"
              method="get"
            >
              {selectedCategory ? <input type="hidden" name="category" value={selectedCategory} /> : null}
              <input
                className="input h-8 border-0 bg-transparent px-0 py-0 text-sm"
                name="q"
                defaultValue={search}
                placeholder="搜索站点、分类或链接"
              />
              <button className="button-secondary px-3 py-1.5 text-xs" type="submit">
                搜索
              </button>
            </form>
            <ThemeToggle redirectTo={currentPath} />
            <div className="metric-card flex min-w-[108px] items-center gap-2 px-3 py-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                C{visibleCategories.length}
              </p>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-line-strong)]">
                |
              </span>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                S{totalSites}
              </p>
            </div>
          </div>
        </header>
        <main className="flex flex-col gap-3">
          <section className="tech-panel px-4 py-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-2">
              <p className="dense-section-title border-b-0 pb-0">Categories</p>
              {selectedCategory || search ? (
                <Link className="button-secondary px-3 py-1.5 text-xs" href="/">
                  清除筛选
                </Link>
              ) : null}
            </div>
            <div className="grid gap-2 pt-4 md:grid-cols-2 xl:grid-cols-4">
              {visibleCategories.map((category) => {
                const isActive = selectedCategory === category.slug;
                const href = buildIndexHref({
                  category: isActive ? null : category.slug,
                  q: search || null,
                });

                return (
                  <Link
                    key={category.id}
                    id={`cat-${category.slug}`}
                    href={href}
                    className={`border px-3 py-3 ${
                      isActive
                        ? "border-[var(--color-ink)] bg-[var(--color-panel-soft)]"
                        : "border-[var(--color-line)] bg-[var(--color-panel)] hover:border-[var(--color-line-strong)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className="dot-link"
                          style={{
                            backgroundColor: category.color,
                            borderColor: category.color,
                            color: category.color,
                          }}
                        />
                        <h2 className="mt-2 text-sm font-semibold">{category.name}</h2>
                      </div>
                      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
                        {category.sites.length}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      /{category.slug}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
          {featuredSites.length ? (
            <section className="tech-panel px-4 py-4">
              <div className="border-b border-[var(--color-line)] pb-2">
                <p className="dense-section-title border-b-0 pb-0">Featured</p>
              </div>
              <div className="grid gap-2 pt-4 md:grid-cols-2 xl:grid-cols-3">
                {featuredSites.map((site) => (
                  <a
                    key={site.id}
                    href={site.href}
                    className="border border-[var(--color-line)] bg-[var(--color-panel-soft)]"
                    target={site.external ? "_blank" : undefined}
                    rel={site.external ? "noreferrer" : undefined}
                  >
                    <div className="aspect-[16/7] border-b border-[var(--color-line)] bg-[var(--color-bg-alt)]">
                      <img
                        alt={site.name}
                        className="h-full w-full object-cover"
                        src={site.featureImage || ""}
                      />
                    </div>
                    <div className="px-3 py-3">
                      <p className="text-sm font-semibold">{site.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                        {site.description || site.categoryName}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
          <section className="tech-panel px-4 py-4">
            <SiteGrid
              items={filteredSites}
              selectedCategory={selectedCategory}
              search={search}
            />
          </section>
        </main>
        <footer className="tech-panel flex flex-col gap-3 px-4 py-4 text-sm text-[var(--color-muted)] md:flex-row md:items-start md:justify-between">
          <p>{footerText}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {footerLinks.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[11px] uppercase tracking-[0.16em] hover:text-[var(--color-accent)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
