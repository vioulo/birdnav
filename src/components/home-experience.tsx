"use client";

import { startTransition, useDeferredValue, useState } from "react";

import { SiteGrid } from "@/components/site-grid";
import { ThemeToggle } from "@/components/theme-toggle";

type HomeExperienceProps = {
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    color: string;
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
  totalSites: number;
};

export function HomeExperience({
  categories,
  items,
  initialCategory,
  initialSearch,
  totalSites,
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
      <header className="site-header">
        <div className="header-brand">
          <div className="logo">BIRDNAV</div>
          <div className="header-brand-meta">
            <span>{categories.length} categories</span>
            <span>{totalSites} links indexed</span>
          </div>
        </div>
        <div className="search-bar">
          <input
            name="q"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search links, categories, keywords..."
          />
        </div>
        <ThemeToggle />
      </header>

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
