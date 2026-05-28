import Link from "next/link";
import { notFound } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { getOptionValue } from "@/lib/options";
import { prisma } from "@/lib/prisma";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const siteId = Number(id);

  if (!siteId) {
    notFound();
  }

  const [site, footerText, footerLinksRaw] = await Promise.all([
    prisma.site.findUnique({
      where: { id: siteId },
      include: {
        category: true,
      },
    }),
    getOptionValue("footer.copyright"),
    getOptionValue("footer.links"),
  ]);

  if (!site || !site.isPublished) {
    notFound();
  }

  return (
    <div className="min-h-screen text-[var(--color-ink)]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-4 py-4 md:px-6">
        <header className="tech-panel-strong flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="eyebrow">BirdNav / Detail</p>
            <h1 className="mt-2 text-2xl font-semibold">{site.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle redirectTo={`/site/${site.id}`} />
            <a className="button-primary" href={site.url} target="_blank" rel="noreferrer">
              前往站点
            </a>
          </div>
        </header>
        <main className="grid gap-3 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="tech-panel p-5">
            <p className="dense-section-title">Summary</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className="dot-link"
                  style={{ color: site.category.color, backgroundColor: site.category.color }}
                />
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  {site.category.name}
                </span>
              </div>
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                {site.description || "暂无简介。"}
              </p>
              <p className="break-all font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                {site.url}
              </p>
            </div>
          </section>
          <aside className="tech-panel p-5">
            <p className="dense-section-title">Actions</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link className="button-secondary" href="/">
                返回首页
              </Link>
              <Link className="button-secondary" href={`/?category=${site.category.slug}`}>
                查看同类链接
              </Link>
            </div>
          </aside>
        </main>
        <footer className="tech-panel flex flex-col gap-2 px-4 py-4 text-sm text-[var(--color-muted)] md:flex-row md:items-center md:justify-between">
          <p>{footerText}</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
            links {footerLinksRaw.split("\n").filter(Boolean).length}
          </p>
        </footer>
      </div>
    </div>
  );
}
