import { HomeExperience } from "@/components/home-experience";
import { SiteFooter } from "@/components/site-footer";
import { headers } from "next/headers";
import {
  getOptionValue,
  isSiteClickBehavior,
  parseFooterLinks,
  type SiteClickBehavior,
} from "@/lib/options";
import {
  getHomeCategories,
  getHomeFeaturedItems,
  getHomeSitesPage,
  readNonNegativeInteger,
  readPositiveInteger,
} from "@/services/sites/site-home-service";
import { getThemeMode } from "@/lib/theme";
import { extractUtmSource } from "@/lib/utils";

function readQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedCategoryRaw = readQueryValue(params.category).trim() || "all";
  const search = readQueryValue(params.q).trim();
  const headersList = await headers();
  const utmSource = extractUtmSource(headersList.get("host") || "");

  const [
    categories,
    siteTitle,
    siteSubtitle,
    footerText,
    footerLinksRaw,
    clickBehaviorRaw,
    homePageSizeRaw,
    homeFeaturedLimitRaw,
    themeMode,
  ] = await Promise.all([
    getHomeCategories(),
    getOptionValue("site.title"),
    getOptionValue("site.subtitle"),
    getOptionValue("footer.copyright"),
    getOptionValue("footer.links"),
    getOptionValue("site.click_behavior", "detail"),
    getOptionValue("home.page_size", "100"),
    getOptionValue("home.featured_limit", "12"),
    getThemeMode(),
  ]);

  const clickBehavior: SiteClickBehavior = isSiteClickBehavior(clickBehaviorRaw)
    ? clickBehaviorRaw
    : "detail";
  const footerLinks = parseFooterLinks(footerLinksRaw);
  const homePageSize = readPositiveInteger(homePageSizeRaw, 100, 500);
  const homeFeaturedLimit = readNonNegativeInteger(homeFeaturedLimitRaw, 12, 100);
  const knownCategorySlugs = new Set(categories.map((category) => category.slug));
  const selectedCategory =
    selectedCategoryRaw === "all" || knownCategorySlugs.has(selectedCategoryRaw)
      ? selectedCategoryRaw
      : "all";
  const visibleCategories = categories.filter((category) => category.publishedSiteCount > 0);

  const [{ items, total }, featuredItems] = await Promise.all([
    getHomeSitesPage({
      categorySlug: selectedCategory,
      search,
      page: 1,
      pageSize: homePageSize,
      clickBehavior,
      utmSource,
    }),
    getHomeFeaturedItems({
      categorySlug: selectedCategory,
      search,
      featuredLimit: homeFeaturedLimit,
      clickBehavior,
      utmSource,
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <HomeExperience
        categories={visibleCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          color: category.color,
        }))}
        applyCategories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        items={items}
        featuredItems={featuredItems}
        initialCategory={selectedCategory}
        initialSearch={search}
        initialTheme={themeMode}
        pageSize={homePageSize}
        totalItems={total}
        siteTitle={siteTitle}
        siteSubtitle={siteSubtitle}
      />

      <SiteFooter copyright={footerText} links={footerLinks} />
    </div>
  );
}
