type DataTableLoadingProps = {
  rows?: number;
  /** 骨架列布局变体：site 表 7 列，cat 表 6 列 */
  variant?: "sites" | "cats";
  /** 列头标签，与实际页面 columns 保持一致 */
  columns?: string[];
};

const SITE_COLUMNS = ["图标", "站点名称 / 链接", "所属分类", "排序权重", "推广状态", "发布状态", "操作"];
const CAT_COLUMNS = ["分类色块", "分类名称 / Slug", "关联站点", "排序权重", "HEX 色值", "操作"];

export function DataTableLoading({
  rows = 5,
  variant = "sites",
  columns,
}: DataTableLoadingProps) {
  const cols = columns ?? (variant === "cats" ? CAT_COLUMNS : SITE_COLUMNS);
  const gridClass = variant === "cats" ? "is-cat-skeleton" : "is-site-skeleton";

  return (
    <>
      {/* 工具栏骨架 */}
      <div className="admin-skeleton-toolbar">
        <div className="admin-skeleton-toolbar-title">
          <span className="admin-skeleton admin-skeleton-eyebrow" />
          <span className="admin-skeleton admin-skeleton-heading" />
        </div>
        <div className="admin-skeleton-toolbar-controls">
          <span className="admin-skeleton admin-skeleton-input" />
          <span className="admin-skeleton admin-skeleton-button" />
        </div>
      </div>

      {/* 列头骨架 */}
      <div className={`admin-skeleton-columns ${gridClass}`}>
        {cols.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      {/* 数据行骨架 */}
      <div className="admin-record-list" aria-busy="true" aria-label="加载中">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`admin-skeleton-row ${gridClass}`}>
            <span className="admin-skeleton admin-skeleton-icon" />
            <span className="admin-skeleton admin-skeleton-text" />
            <span className="admin-skeleton admin-skeleton-badge" />
            <span className="admin-skeleton admin-skeleton-badge" />
            {variant === "sites" && (
              <span className="admin-skeleton admin-skeleton-badge" />
            )}
            <span className="admin-skeleton admin-skeleton-actions" />
          </div>
        ))}
      </div>
    </>
  );
}
