import Link from "next/link";

import { SiteIcon } from "@/components/site-icon";
type SiteGridProps = {
  onCategorySelect: (categorySlug: string) => void;
  items: Array<{
    id: number;
    name: string;
    href: string;
    iconUrl?: string | null;
    color: string;
    categoryName: string;
    categorySlug: string;
    description?: string | null;
    featureImage?: string | null;
    isFeatured?: boolean;
    external?: boolean;
  }>;
};

export function SiteGrid({ onCategorySelect, items }: SiteGridProps) {
  return (
    <section className="links-grid">
      {items.length ? (
        items.map((item) => (
          <div key={item.id} className="link-pill-shell">
            {item.external ? (
              <a
                href={item.href}
                className="link-pill"
                target="_blank"
                rel="noreferrer"
                title={`${item.categoryName}${item.description ? ` · ${item.description}` : ""}`}
              >
                <span className="link-pill-icon" aria-hidden="true">
                  <SiteIcon
                    src={item.iconUrl}
                    label={item.name}
                    imgClassName="link-pill-icon-image"
                    fallbackClassName="link-pill-icon-fallback"
                  />
                </span>
                <span className="link-pill-name">{item.name}</span>
                <span className="link-pill-arrow">↗</span>
              </a>
            ) : (
              <Link
                href={item.href}
                className="link-pill"
                title={`${item.categoryName}${item.description ? ` · ${item.description}` : ""}`}
              >
                <span className="link-pill-icon" aria-hidden="true">
                  <SiteIcon
                    src={item.iconUrl}
                    label={item.name}
                    imgClassName="link-pill-icon-image"
                    fallbackClassName="link-pill-icon-fallback"
                  />
                </span>
                <span className="link-pill-name">{item.name}</span>
              </Link>
            )}
            <button
              type="button"
              className="link-pill-filter"
              aria-label={`筛选分类：${item.categoryName}`}
              title={`筛选分类：${item.categoryName}`}
              onClick={() => onCategorySelect(item.categorySlug)}
            >
              <span
                className="link-pill-dot"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
            </button>
          </div>
        ))
      ) : (
        <div className="empty-state">
          没有匹配到可展示的站点。
        </div>
      )}
    </section>
  );
}
