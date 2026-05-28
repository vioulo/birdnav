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
  selectedCategory?: string | null;
  search?: string;
};

export function SiteGrid({ items, selectedCategory, search }: SiteGridProps) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-2">
        <p className="dense-section-title border-b-0 pb-0">Links</p>
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-muted)]">
          {selectedCategory ? `filter ${selectedCategory}` : "all categories"}
          {search ? ` / search ${search}` : ""}
        </div>
      </div>
      {items.length ? (
        <div className="grid gap-x-6 gap-y-2 pt-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-start gap-3 border-b border-[var(--color-line)] py-2"
            >
              <a
                href={selectedCategory === item.categorySlug ? "/" : `/?category=${item.categorySlug}`}
                className="mt-1.5 inline-flex"
                aria-label={`筛选 ${item.categoryName}`}
                style={{ color: item.color }}
              >
                <span
                  className="dot-link"
                  style={{ backgroundColor: item.color, borderColor: item.color }}
                />
              </a>
              <a
                href={item.href}
                className="min-w-0 text-sm leading-6 text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
              >
                {item.name}
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-sm text-[var(--color-muted)]">
          没有匹配到可展示的站点。
        </div>
      )}
    </section>
  );
}
