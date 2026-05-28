type SiteGridProps = {
  items: Array<{
    id: number;
    name: string;
    href: string;
    color: string;
    categoryName: string;
    categorySlug: string;
    external?: boolean;
  }>;
};

export function SiteGrid({ items }: SiteGridProps) {
  return (
    <section className="links-grid">
      {items.length ? (
        items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="link-item"
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer" : undefined}
          >
            <span
              className="dot-indicator"
              style={{ backgroundColor: item.color }}
              title={`分类：${item.categoryName}`}
            />
            <span>{item.name}</span>
          </a>
        ))
      ) : (
        <div className="empty-state">
          没有匹配到可展示的站点。
        </div>
      )}
    </section>
  );
}
