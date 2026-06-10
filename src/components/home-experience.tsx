"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

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
  featuredItems: Array<{
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
  pageSize: number;
  totalItems: number;
  siteTitle: string;
  siteSubtitle: string;
};

const SEARCH_SYNC_DELAY_MS = 180;

function buildHomeHref(pathname: string, category: string, search: string) {
  const params = new URLSearchParams();

  if (category && category !== "all") {
    params.set("category", category);
  }

  if (search) {
    params.set("q", search);
  }

  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function buildHomeSitesApiHref(category: string, search: string, page: number, pageSize: number) {
  const params = new URLSearchParams();

  if (category && category !== "all") {
    params.set("category", category);
  }

  if (search) {
    params.set("q", search);
  }

  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  return `/api/home/sites?${params.toString()}`;
}

type HomeResultsProps = {
  items: HomeExperienceProps["items"];
  totalItems: number;
  pageSize: number;
  selectedCategory: string;
  search: string;
  initialCategory: string;
  initialSearch: string;
  isNavigating: boolean;
  onCategorySelect: (categorySlug: string) => void;
};

function HomeResultsSkeleton() {
  return (
    <section className="link-cloud" aria-hidden="true">
      <div className="home-results-skeleton">
        {Array.from({ length: 20 }, (_, index) => (
          <span key={index} className="home-results-skeleton-item" />
        ))}
      </div>
    </section>
  );
}

function HomeResults({
  items,
  totalItems,
  pageSize,
  selectedCategory,
  search,
  initialCategory,
  initialSearch,
  isNavigating,
  onCategorySelect,
}: HomeResultsProps) {
  const [renderedItems, setRenderedItems] = useState(items);
  const [renderedTotal, setRenderedTotal] = useState(totalItems);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const isMountedRef = useRef(true);
  const hasPendingFilterChange =
    selectedCategory !== initialCategory || search.trim() !== initialSearch;
  const hasMoreItems = renderedItems.length < renderedTotal;
  const nextPage = Math.ceil(renderedItems.length / pageSize) + 1;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function handleLoadMore() {
    if (isLoadingMore || isNavigating || hasPendingFilterChange || !hasMoreItems) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError("");

    try {
      const response = await fetch(
        buildHomeSitesApiHref(selectedCategory, search.trim(), nextPage, pageSize),
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load more items.");
      }

      const payload: {
        total: number;
        items: HomeExperienceProps["items"];
      } = await response.json();

      if (!isMountedRef.current) {
        return;
      }

      setRenderedItems((currentItems) => {
        const knownIds = new Set(currentItems.map((item) => item.id));
        const nextItems = payload.items.filter((item) => !knownIds.has(item.id));

        return currentItems.concat(nextItems);
      });
      setRenderedTotal(payload.total);
    } catch {
      if (isMountedRef.current) {
        setLoadMoreError("加载更多失败，请重试。");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
      }
    }
  }

  if (isNavigating || hasPendingFilterChange) {
    return <HomeResultsSkeleton />;
  }

  return (
    <section className="link-cloud">
      <SiteGrid
        items={renderedItems}
        onCategorySelect={onCategorySelect}
      />
      {loadMoreError ? (
        <p className="load-more-error" role="status">
          {loadMoreError}
        </p>
      ) : null}
      {hasMoreItems ? (
        <div className="load-more-row">
          <button
            className="button-secondary"
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore || isNavigating || hasPendingFilterChange}
          >
            {isLoadingMore
              ? "加载中..."
              : isNavigating || hasPendingFilterChange
                ? "筛选中..."
                : "加载更多"}
            <span>
              {renderedItems.length}/{renderedTotal}
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function HomeExperience({
  categories,
  applyCategories,
  items,
  featuredItems,
  initialCategory,
  initialSearch,
  initialTheme,
  pageSize,
  totalItems,
  siteTitle,
  siteSubtitle,
}: HomeExperienceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const deferredSearch = useDeferredValue(search);
  const skipNavigationRef = useRef(false);
  const normalizedSearch = deferredSearch.trim();
  const redirectTo = buildHomeHref(pathname, selectedCategory, search.trim());

  useEffect(() => {
    if (skipNavigationRef.current) {
      skipNavigationRef.current = false;
      return;
    }

    if (selectedCategory === initialCategory && normalizedSearch === initialSearch) {
      return;
    }

    const href = buildHomeHref(pathname, selectedCategory, normalizedSearch);
    const timeoutId = window.setTimeout(() => {
      startNavigation(() => {
        router.replace(href, { scroll: false });
      });
    }, SEARCH_SYNC_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    initialCategory,
    initialSearch,
    normalizedSearch,
    pathname,
    router,
    selectedCategory,
    startNavigation,
  ]);

  function handleCategoryChange(nextCategory: string) {
    if (nextCategory === selectedCategory) {
      return;
    }

    skipNavigationRef.current = true;
    setSelectedCategory(nextCategory);
    startNavigation(() => {
      router.replace(buildHomeHref(pathname, nextCategory, search.trim()), { scroll: false });
    });
  }

  return (
    <>
      <SiteHeader
        title={siteTitle}
        meta={[siteSubtitle]}
        initialTheme={initialTheme}
        redirectTo={redirectTo}
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
              onClick={() => handleCategoryChange("all")}
            >
              all
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`cat-chip ${selectedCategory === category.slug ? "active" : ""}`}
                onClick={() => handleCategoryChange(category.slug)}
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
              item.external ? (
                <a
                  key={item.id}
                  href={item.href}
                  className="featured-pill"
                  target="_blank"
                  rel="noreferrer"
                  title={item.description || item.categoryName}
                >
                  <strong>{item.name}</strong>
                  <span className="featured-pill-desc">
                    {item.description || "精选入口"}
                  </span>
                </a>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  className="featured-pill"
                  title={item.description || item.categoryName}
                >
                  <strong>{item.name}</strong>
                  <span className="featured-pill-desc">
                    {item.description || "精选入口"}
                  </span>
                </Link>
              )
            ))}
          </section>
        ) : null}

        <HomeResults
          key={`${initialCategory}:${initialSearch}:${pageSize}:${items.length}:${totalItems}`}
          items={items}
          totalItems={totalItems}
          pageSize={pageSize}
          selectedCategory={selectedCategory}
          search={search}
          initialCategory={initialCategory}
          initialSearch={initialSearch}
          isNavigating={isNavigating}
          onCategorySelect={handleCategoryChange}
        />
      </main>
    </>
  );
}
