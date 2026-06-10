import { AdminPageHeaderSkeleton } from "@/components/admin-page-header-skeleton";

const LOG_ROWS = 8;

export default function LogsLoading() {
  return (
    <>
      <AdminPageHeaderSkeleton
        eyebrow="Audit Logs"
        title="操作日志"
        description="追踪后台关键变更，方便回看内容和账户操作。"
        metaCount={2}
      />
      <div className="admin-loading-shell">
        <section className="list-shell" aria-busy="true" aria-label="加载中">
          <div className="list-head md:grid-cols-[180px_160px_140px_1fr_120px]">
            <div>时间</div>
            <div>管理员</div>
            <div>动作</div>
            <div>摘要</div>
            <div>目标</div>
          </div>
          <div>
            {Array.from({ length: LOG_ROWS }).map((_, i) => (
              <div
                key={i}
                className="list-row md:grid-cols-[180px_160px_140px_1fr_120px] admin-skeleton-log-row"
              >
                <span className="admin-skeleton admin-skeleton-log-time" />
                <span className="admin-skeleton admin-skeleton-log-user" />
                <span className="admin-skeleton admin-skeleton-log-action" />
                <span className="admin-skeleton admin-skeleton-log-summary" />
                <span className="admin-skeleton admin-skeleton-log-target" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
