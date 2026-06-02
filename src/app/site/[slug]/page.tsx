import type { CSSProperties } from "react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteIcon } from "@/components/site-icon";
import { getOptionValue, parseFooterLinks } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { getThemeMode } from "@/lib/theme";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const legacySiteId = /^\d+$/.test(slug) ? Number(slug) : null;
  const siteWhere: Prisma.SiteWhereUniqueInput = legacySiteId
    ? { id: legacySiteId }
    : { slug };

  const [site, siteTitle, footerText, footerLinksRaw, themeMode] = await Promise.all([
    prisma.site.findUnique({
      where: siteWhere,
      include: {
        category: true,
      },
    }),
    getOptionValue("site.title"),
    getOptionValue("footer.copyright"),
    getOptionValue("footer.links"),
    getThemeMode(),
  ]);

  if (!site || !site.isPublished) {
    notFound();
  }

  if (legacySiteId) {
    redirect(`/site/${site.slug}`);
  }

  const footerLinks = parseFooterLinks(footerLinksRaw);
  const detailStyle = {
    "--detail-color": site.category.color,
  } as CSSProperties;

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <SiteHeader
        title={siteTitle}
        meta={["detail node", site.category.name]}
        initialTheme={themeMode}
        redirectTo={`/site/${site.slug}`}
      />

      <main className="site-main detail-main" style={detailStyle}>
        <div className="detail-shell">
          <section className="detail-card">
            <div className="detail-summary-row">
              <span className="detail-icon" aria-hidden="true">
                <SiteIcon
                  src={site.iconUrl}
                  label={site.name}
                  alt={site.name}
                  imgClassName=""
                  fallbackClassName=""
                />
              </span>
              <div className="detail-title-block">
                <h1>{site.name}</h1>
                <Link className="detail-category" href={`/?category=${site.category.slug}`}>
                  <span className="detail-color-chip" aria-hidden="true" />
                  {site.category.name}
                </Link>
              </div>
            </div>

            <div className="detail-description">
              <p className="detail-label">Description</p>
              <p>{site.description || "这个链接还没有填写简介，但入口已经可以使用。"}</p>
            </div>
          </section>

          <div className="detail-description-actions">
            <Link className="detail-button" href="/">
              返回首页
            </Link>
            <a className="detail-button is-primary" href={site.url} target="_blank" rel="noreferrer">
              访问站点 ↗
            </a>
          </div>
        </div>
      </main>

      <SiteFooter copyright={footerText} links={footerLinks} />
    </div>
  );
}
