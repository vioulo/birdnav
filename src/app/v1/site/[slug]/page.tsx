import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { ExternalLink, MoveLeft } from "lucide-react";

import { SiteIcon } from "@/components/site-icon";
import { V1Shell } from "@/components/v1-shell";
import { getOptionValue, parseFooterLinks } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { getThemeMode } from "@/lib/theme";
import { appendUtmSource, extractUtmSource } from "@/lib/utils";

export default async function V1SiteDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const headersList = await headers();
  const utmSource = extractUtmSource(headersList.get("host") || "");
  const legacySiteId = /^\d+$/.test(slug) ? Number(slug) : null;
  const siteWhere: Prisma.SiteWhereUniqueInput = legacySiteId
    ? { id: legacySiteId }
    : { slug };

  const [site, siteTitle, siteSubtitle, footerText, footerLinksRaw, themeMode] =
    await Promise.all([
      prisma.site.findUnique({
        where: siteWhere,
        include: {
          category: true,
        },
      }),
      getOptionValue("site.title"),
      getOptionValue("site.subtitle"),
      getOptionValue("footer.copyright"),
      getOptionValue("footer.links"),
      getThemeMode(),
    ]);

  if (!site || !site.isPublished) {
    notFound();
  }

  if (legacySiteId) {
    redirect(`/v1/site/${site.slug}`);
  }

  const footerLinks = parseFooterLinks(footerLinksRaw);

  return (
    <V1Shell
      footerLinks={footerLinks}
      footerText={footerText}
      initialTheme={themeMode}
      siteTitle={siteTitle}
      siteSubtitle={siteSubtitle}
    >
      <main className="v1-container v1-detail-container">
        <section className="v1-detail-card">
          <div className="v1-detail-summary">
            <span className="v1-detail-icon" aria-hidden="true">
              <SiteIcon
                src={site.iconUrl}
                label={site.name}
                alt={site.name}
                imgClassName=""
                fallbackClassName=""
              />
            </span>
            <div className="v1-detail-title">
              <p className="v1-eyebrow">{site.category.name}</p>
              <h1>{site.name}</h1>
              <p>{site.description || "这个链接还没有填写简介，但入口已经可以使用。"}</p>
            </div>
          </div>

          <div className="v1-detail-meta">
            <span>{site.url}</span>
          </div>

          <div className="v1-detail-actions">
            <Link className="v1-detail-button" href="/v1">
              <MoveLeft aria-hidden="true" />
              返回 V1
            </Link>
            <a className="v1-detail-button is-primary" href={appendUtmSource(site.url, utmSource)} target="_blank" rel="noreferrer">
              访问站点
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
    </V1Shell>
  );
}
