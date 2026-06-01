import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

function buildLogsHref(page: number) {
  return page > 1 ? `/admin/logs?page=${page}` : "/admin/logs";
}

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || "1") || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      skip,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell currentPath="/admin/logs" username={admin.username}>
      <AdminPageHeader
        eyebrow="Audit Logs"
        title="操作日志"
        description="追踪后台关键变更，方便回看内容和账户操作。"
        meta={
          <>
            <span>total {total}</span>
            <span>page {page}/{totalPages}</span>
          </>
        }
      />

      <section className="list-shell">
        <div className="list-head md:grid-cols-[180px_160px_140px_1fr_120px]">
          <div>时间</div>
          <div>管理员</div>
          <div>动作</div>
          <div>摘要</div>
          <div>目标</div>
        </div>
        <div>
          {logs.map((log) => (
            <div
              key={log.id}
              className="list-row md:grid-cols-[180px_160px_140px_1fr_120px]"
            >
              <div className="text-sm text-[var(--color-muted)]">
                {log.createdAt.toLocaleString("zh-CN")}
              </div>
              <div>{log.user?.username || "system"}</div>
              <div className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {log.action}
              </div>
              <div className="text-sm leading-6">{log.summary}</div>
              <div className="font-mono text-xs text-[var(--color-muted)]">
                {log.targetType}
                {log.targetId ? `#${log.targetId}` : ""}
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 ? (
          <div className="pager">
            <p className="pager-meta">
              显示 {skip + 1}-{Math.min(skip + PAGE_SIZE, total)} / {total}
            </p>
            <div className="pager-links">
              <a
                className={`button-secondary pager-link ${page <= 1 ? "is-disabled" : ""}`}
                href={page > 1 ? buildLogsHref(page - 1) : buildLogsHref(1)}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
              >
                上一页
              </a>
              <a
                className={`button-secondary pager-link ${page >= totalPages ? "is-disabled" : ""}`}
                href={page < totalPages ? buildLogsHref(page + 1) : buildLogsHref(totalPages)}
                aria-disabled={page >= totalPages}
                tabIndex={page >= totalPages ? -1 : undefined}
              >
                下一页
              </a>
            </div>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
