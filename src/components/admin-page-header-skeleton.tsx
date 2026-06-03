type AdminPageHeaderSkeletonProps = {
  eyebrow: string;
  title: string;
  description?: string;
  metaCount?: number;
};

/**
 * 骨架屏版本的 AdminPageHeader。
 * eyebrow / title / description 使用真实文本（纯静态，无数据依赖），
 * meta 区域使用 shimmer 占位块。
 */
export function AdminPageHeaderSkeleton({
  eyebrow,
  title,
  description,
  metaCount = 3,
}: AdminPageHeaderSkeletonProps) {
  return (
    <div className="admin-page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p className="admin-page-header-desc">{description}</p> : null}
      </div>
      <div className="admin-page-header-side">
        <div className="admin-toolbar-meta">
          {Array.from({ length: metaCount }).map((_, i) => (
            <span key={i} className="admin-skeleton admin-skeleton-meta-chip" />
          ))}
        </div>
      </div>
    </div>
  );
}
