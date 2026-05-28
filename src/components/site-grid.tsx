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
            <a
              href={item.href}
              className="link-pill"
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              title={`${item.categoryName}${item.description ? ` · ${item.description}` : ""}`}
            >
              <span className="link-pill-icon" aria-hidden="true">
                {item.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="link-pill-icon-image" src={item.iconUrl} alt="" />
                ) : (
                  <span className="link-pill-icon-fallback">
                    {item.name.trim().slice(0, 1).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="link-pill-name">{item.name}</span>
              {item.external ? <span className="link-pill-arrow">↗</span> : null}
            </a>
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
