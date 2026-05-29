"use client";

import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";

import { V1Shell } from "@/components/v1-shell";
import type { ThemeMode } from "@/lib/options";

type V1Category = {
  id: number;
  name: string;
  sites: Array<{
    id: number;
    name: string;
    href: string;
    url: string;
    iconUrl?: string | null;
    description?: string | null;
    external?: boolean;
  }>;
};

type V1ExperienceProps = {
  categories: V1Category[];
  footerLinks: Array<{
    label: string;
    href: string;
  }>;
  footerText: string;
  initialTheme: ThemeMode;
  siteTitle: string;
  siteSubtitle: string;
};

function iconOf(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

export function V1Experience({
  categories,
  footerLinks,
  footerText,
  initialTheme,
  siteTitle,
  siteSubtitle,
}: V1ExperienceProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const keyword = deferredSearch.trim().toLowerCase();
  const filteredCategories = categories
    .map((category) => ({
      ...category,
      sites: category.sites.filter(
        (site) =>
          !keyword ||
          site.name.toLowerCase().includes(keyword) ||
          site.description?.toLowerCase().includes(keyword) ||
          category.name.toLowerCase().includes(keyword),
      ),
    }))
    .filter((category) => category.sites.length > 0);
  const totalSites = categories.reduce((sum, category) => sum + category.sites.length, 0);

  return (
    <V1Shell
      footerLinks={footerLinks}
      footerText={footerText}
      initialTheme={initialTheme}
      siteTitle={siteTitle}
      siteSubtitle={siteSubtitle}
      topbarContent={
        <div className="v1-search">
          <span className="v1-search-icon" aria-hidden="true">
            <Search />
          </span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索技术 / AI 站点"
            autoComplete="off"
          />
        </div>
      }
    >
      <main className="v1-container">
        <section className="v1-hero">
          <p className="v1-eyebrow">轻量导航 / 发现效率</p>
          <h1>{siteTitle}</h1>
          <p>{siteSubtitle}</p>
          <div className="v1-hero-badges">
            {categories.slice(0, 6).map((category) => (
              <span key={category.id} className="v1-hero-badge">
                {category.name}
              </span>
            ))}
            <span className="v1-hero-badge">{totalSites} links</span>
          </div>
        </section>

        <div className="v1-sections">
          {filteredCategories.length ? (
            filteredCategories.map((category) => (
              <section key={category.id} className="v1-section">
                <div className="v1-section-header">
                  <span className="v1-section-title">{category.name}</span>
                  <span className="v1-section-badge">{category.sites.length}</span>
                </div>
                <div className="v1-card-grid">
                  {category.sites.map((site) => (
                    <a
                      key={site.id}
                      className="v1-card"
                      href={site.href}
                      target={site.external ? "_blank" : undefined}
                      rel={site.external ? "noreferrer" : undefined}
                    >
                      <span className="v1-card-icon" aria-hidden="true">
                        {site.iconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={site.iconUrl} alt="" />
                        ) : (
                          iconOf(site.name)
                        )}
                      </span>
                      <span className="v1-card-text">
                        <span className="v1-card-name">{site.name}</span>
                        <span className="v1-card-sub">{site.description || site.url}</span>
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="v1-no-result">没有找到匹配的站点</div>
          )}
        </div>
      </main>
    </V1Shell>
  );
}
