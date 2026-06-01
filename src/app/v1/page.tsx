import { V1Experience } from "@/components/v1-experience";
import {
  getOptionValue,
  isSiteClickBehavior,
  parseFooterLinks,
  type SiteClickBehavior,
} from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { getThemeMode } from "@/lib/theme";

type V1Site = {
  id: number;
  name: string;
  slug: string;
  url: string;
  iconUrl: string | null;
  description: string | null;
};

type V1Category = {
  id: number;
  name: string;
  sites: V1Site[];
};

export default async function V1Page() {
  const [
    categories,
    siteTitle,
    siteSubtitle,
    footerText,
    footerLinksRaw,
    clickBehaviorRaw,
    themeMode,
  ]: [
    V1Category[],
    string,
    string,
    string,
    string,
    string,
    Awaited<ReturnType<typeof getThemeMode>>,
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
            slug: true,
            url: true,
            iconUrl: true,
            description: true,
          },
        },
      },
    }),
    getOptionValue("site.title"),
    getOptionValue("site.subtitle"),
    getOptionValue("footer.copyright"),
    getOptionValue("footer.links"),
    getOptionValue("site.click_behavior", "detail"),
    getThemeMode(),
  ]);
  const clickBehavior: SiteClickBehavior = isSiteClickBehavior(clickBehaviorRaw)
    ? clickBehaviorRaw
    : "detail";
  const footerLinks = parseFooterLinks(footerLinksRaw);
  const visibleCategories = categories.filter((category) => category.sites.length > 0);

  return (
    <V1Experience
      categories={visibleCategories.map((category) => ({
        id: category.id,
        name: category.name,
        sites: category.sites.map((site) => ({
          id: site.id,
          name: site.name,
          href: clickBehavior === "detail" ? `/v1/site/${site.slug}` : site.url,
          url: site.url,
          iconUrl: site.iconUrl,
          description: site.description,
          external: clickBehavior === "direct",
        })),
      }))}
      footerLinks={footerLinks}
      footerText={footerText}
      initialTheme={themeMode}
      siteTitle={siteTitle}
      siteSubtitle={siteSubtitle}
    />
  );
}
