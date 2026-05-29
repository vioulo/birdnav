import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MoveLeft } from "lucide-react";

import { V1Shell } from "@/components/v1-shell";
import { getOptionValue, parseFooterLinks } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { getThemeMode } from "@/lib/theme";

export default async function V1SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const siteId = Number(id);

  if (!siteId) {
    notFound();
  }

  const [site, siteTitle, siteSubtitle, footerText, footerLinksRaw, themeMode] =
    await Promise.all([
      prisma.site.findUnique({
        where: { id: siteId },
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
              {site.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.iconUrl} alt="" />
              ) : (
                site.name.trim().slice(0, 1).toUpperCase()
              )}
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
            <a className="v1-detail-button is-primary" href={site.url} target="_blank" rel="noreferrer">
              访问站点
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
    </V1Shell>
  );
}
