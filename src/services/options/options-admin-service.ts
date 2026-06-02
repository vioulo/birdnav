import { recordAuditLog } from "@/lib/audit";
import { defaultOptions, upsertOption } from "@/lib/options";

export async function updateAdminOptions(params: {
  adminId: number;
  siteTitle: string;
  siteSubtitle: string;
  siteDescription: string;
  siteKeywords: string;
  siteUrl?: string;
  siteOgImage?: string;
  uiRadius: number;
  clickBehavior: string;
  homePageSize: number;
  homeFeaturedLimit: number;
  footerCopyright: string;
  footerLinks: string;
}) {
  await Promise.all([
    upsertOption("site.title", params.siteTitle || defaultOptions["site.title"]),
    upsertOption("site.subtitle", params.siteSubtitle || defaultOptions["site.subtitle"]),
    upsertOption("site.description", params.siteDescription || defaultOptions["site.description"]),
    upsertOption("site.keywords", params.siteKeywords),
    upsertOption("site.url", params.siteUrl || ""),
    upsertOption("site.og_image", params.siteOgImage || ""),
    upsertOption("ui.radius", String(params.uiRadius)),
    upsertOption("site.click_behavior", params.clickBehavior),
    upsertOption("home.page_size", String(params.homePageSize)),
    upsertOption("home.featured_limit", String(params.homeFeaturedLimit)),
    upsertOption(
      "footer.copyright",
      params.footerCopyright || defaultOptions["footer.copyright"],
    ),
    upsertOption("footer.links", params.footerLinks || defaultOptions["footer.links"]),
  ]);

  await recordAuditLog({
    userId: params.adminId,
    action: "options.update",
    targetType: "option",
    summary: "更新基础配置",
    payload: {
      siteTitle: params.siteTitle,
      siteSubtitle: params.siteSubtitle,
      siteDescription: params.siteDescription,
      siteKeywords: params.siteKeywords,
      siteUrl: params.siteUrl,
      hasOgImage: !!params.siteOgImage,
      uiRadius: params.uiRadius,
      clickBehavior: params.clickBehavior,
      homePageSize: params.homePageSize,
      homeFeaturedLimit: params.homeFeaturedLimit,
      footerCopyright: params.footerCopyright,
      footerLinksLineCount: params.footerLinks.split("\n").filter(Boolean).length,
    },
  });
}
