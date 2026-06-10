import { AdminPageHeaderSkeleton } from "@/components/admin-page-header-skeleton";

export default function OptionsLoading() {
  return (
    <>
      <AdminPageHeaderSkeleton
        eyebrow="Options"
        title="基础配置"
        description="控制前台展示、跳转行为和 footer 文案。"
        metaCount={5}
      />
      <div className="admin-loading-shell">
        <div className="admin-settings-shell" aria-busy="true" aria-label="加载中">
          {Array.from({ length: 3 }).map((_, i) => (
            <section key={i} className="admin-settings-panel">
              <div className="admin-board-head">
                <div>
                  <span className="admin-skeleton admin-skeleton-eyebrow" />
                  <span className="admin-skeleton admin-skeleton-heading" style={{ marginTop: 6, display: "block" }} />
                </div>
              </div>
              <div className="admin-settings-grid">
                {Array.from({ length: i === 0 ? 4 : 3 }).map((__, j) => (
                  <label key={j} className="admin-field">
                    <span className="admin-skeleton admin-skeleton-field-label" />
                    <span className="admin-skeleton admin-skeleton-field-input" />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
