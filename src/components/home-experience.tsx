"use client";

import { startTransition, useDeferredValue, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteApplyDialog } from "@/components/site-apply-dialog";
import { SiteGrid } from "@/components/site-grid";
import type { ThemeMode } from "@/lib/options";

type HomeExperienceProps = {
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    color: string;
  }>;
  applyCategories: Array<{
    id: number;
    name: string;
  }>;
  items: Array<{
    id: number;
    name: string;
    href: string;
    iconUrl?: string | null;
    color: string;
    categoryName: string;
    categorySlug: string;
    external?: boolean;
    isFeatured?: boolean;
    featureImage?: string | null;
    description?: string | null;
  }>;
  initialCategory: string;
  initialSearch: string;
  initialTheme: ThemeMode;
  siteTitle: string;
  siteSubtitle: string;
};

export function HomeExperience({
  categories,
  applyCategories,
  items,
  initialCategory,
  initialSearch,
  initialTheme,
  siteTitle,
  siteSubtitle,
}: HomeExperienceProps) {
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const deferredSearch = useDeferredValue(search);
  const keyword = deferredSearch.trim().toLowerCase();

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.categorySlug === selectedCategory;
    const matchesSearch =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.categoryName.toLowerCase().includes(keyword) ||
      item.description?.toLowerCase().includes(keyword);

    return matchesCategory && matchesSearch;
  });

  const featuredItems = filteredItems.filter((item) => item.isFeatured).slice(0, 6);

  return (
    <>
      <SiteHeader
        title={siteTitle}
        meta={[siteSubtitle]}
        initialTheme={initialTheme}
      >
        <div className="search-bar">
          <input
            name="q"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search links, categories, keywords..."
          />
        </div>
        <SiteApplyDialog
          categories={applyCategories}
        />
      </SiteHeader>

      <main className="site-main">
        <section className="filter-strip">
          <div className="filter-scroll">
            <button
              type="button"
              className={`cat-chip ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => {
                startTransition(() => setSelectedCategory("all"));
              }}
            >
              all
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`cat-chip ${selectedCategory === category.slug ? "active" : ""}`}
                onClick={() => {
                  startTransition(() => setSelectedCategory(category.slug));
                }}
              >
                <span
                  className="cat-chip-dot"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                {category.name}
              </button>
            ))}
          </div>
        </section>

        {featuredItems.length ? (
          <section className="featured-stream">
            {featuredItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="featured-pill"
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
                title={item.description || item.categoryName}
              >
                <strong>{item.name}</strong>
                <span className="featured-pill-desc">
                  {item.description || "精选入口"}
                </span>
              </a>
            ))}
          </section>
        ) : null}

        <section className="link-cloud">
          <SiteGrid
            items={filteredItems}
            onCategorySelect={(categorySlug) => {
              startTransition(() => setSelectedCategory(categorySlug));
            }}
          />
        </section>
      </main>
    </>
  );
}
