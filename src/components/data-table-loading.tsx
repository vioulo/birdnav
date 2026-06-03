type DataTableLoadingProps = {
  rows?: number;
};

export function DataTableLoading({ rows = 5 }: DataTableLoadingProps) {
  return (
    <div className="admin-record-list" aria-busy="true" aria-label="加载中">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="admin-skeleton-row">
          <span className="admin-skeleton admin-skeleton-icon" />
          <span className="admin-skeleton admin-skeleton-text" />
          <span className="admin-skeleton admin-skeleton-badge" />
          <span className="admin-skeleton admin-skeleton-badge" />
          <span className="admin-skeleton admin-skeleton-badge" />
          <span className="admin-skeleton admin-skeleton-actions" />
        </div>
      ))}
    </div>
  );
}
