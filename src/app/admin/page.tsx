import Link from "next/link";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { appVersion } from "@/lib/app-version";
import { prisma } from "@/lib/prisma";

const RECENT_ACTIVITY_LIMIT = 5;
const OVERVIEW_CATEGORY_LIMIT = 10;

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const [
    userCount,
    categoryCount,
    siteCount,
    publishedCount,
    featuredCount,
    categories,
    recentLogs,
  ] =
    await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.site.count(),
      prisma.site.count({ where: { isPublished: true } }),
      prisma.site.count({ where: { isFeatured: true } }),
      prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          _count: {
            select: {
              sites: true,
            },
          },
        },
        take: OVERVIEW_CATEGORY_LIMIT,
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          summary: true,
          createdAt: true,
        },
        take: RECENT_ACTIVITY_LIMIT,
      }),
    ]);
  const hiddenCategoryCount = Math.max(0, categoryCount - categories.length);
  const hiddenCount = siteCount - publishedCount;
  const maxCategorySites = Math.max(
    1,
    ...categories.map((category) => category._count.sites),
  );
  const metrics = [
    { label: "管理员", value: userCount, hint: "后台账号" },
    { label: "分类", value: categoryCount, hint: "前台筛选组" },
    { label: "站点", value: siteCount, hint: `${publishedCount} 个已发布` },
    { label: "推广", value: featuredCount, hint: `${hiddenCount} 个隐藏` },
  ];

  return (
    <AdminShell currentPath="/admin" username={admin.username}>
      <AdminPageHeader
        eyebrow="Overview"
        title="导航站概览"
        description="追踪当前导航的规模、分类分布和后台操作入口。"
        meta={
          <>
            <span>{siteCount} sites</span>
            <span>{categoryCount} categories</span>
            <span>{featuredCount} featured</span>
          </>
        }
      />

      <section className="admin-overview-stats">
        {metrics.map((item) => (
          <div key={item.label} className="admin-overview-stat">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
          </div>
        ))}
      </section>

      <div className="admin-overview-grid">
        <section className="admin-board">
          <div className="admin-board-head">
            <div>
              <p className="eyebrow">Distribution</p>
              <h3>分类分布</h3>
            </div>
            <Link href="/admin/cats" className="admin-text-link">
              管理分类
            </Link>
          </div>
          <div className="admin-data-table-columns is-overview-cat-table">
            <span>色块</span>
            <span>分类名称 / Slug</span>
            <span>站点数</span>
            <span>排序</span>
            <span>占比</span>
          </div>
          <div className="admin-overview-list">
            {categories.length ? (
              categories.map((category) => {
                const percent = Math.round((category._count.sites / Math.max(1, siteCount)) * 100);
                const barScale = category._count.sites / maxCategorySites;

                return (
                  <div key={category.id} className="admin-overview-row is-overview-cat-row">
                    <span
                      className="admin-category-swatch"
                      style={{ color: category.color, backgroundColor: category.color }}
                      aria-hidden="true"
                    />
                    <span className="admin-record-main">
                      <strong>{category.name}</strong>
                      <span>/{category.slug}</span>
                    </span>
                    <span className="admin-table-cell">{category._count.sites} 个站点</span>
                    <span className="admin-table-cell">权重 {category.sortOrder}</span>
                    <span className="admin-mini-bar" style={{ color: category.color }}>
                      <span style={{ transform: `scaleX(${barScale})` }} />
                      <small>{percent}%</small>
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">还没有分类数据。</div>
            )}
            {hiddenCategoryCount > 0 ? (
              <div className="empty-state">
                仅显示前 {OVERVIEW_CATEGORY_LIMIT} 条，其余 {hiddenCategoryCount} 条已省略。
              </div>
            ) : null}
          </div>
        </section>

        <aside className="admin-side-stack">
          <section className="admin-board">
            <div className="admin-board-head">
              <div>
                <p className="eyebrow">Actions</p>
                <h3>快速入口</h3>
              </div>
            </div>
            <div className="admin-quick-actions">
              <Link className="admin-quick-action" href="/admin/sites?modal=new">
                <span>新建站点</span>
                <small>补充新的导航入口</small>
              </Link>
              <Link className="admin-quick-action" href="/admin/cats?modal=new">
                <span>新建分类</span>
                <small>整理前台筛选分组</small>
              </Link>
              <Link className="admin-quick-action" href="/admin/options">
                <span>基础配置</span>
                <small>调整主题、跳转和页脚</small>
              </Link>
            </div>
          </section>

          <section className="admin-board">
            <div className="admin-board-head is-compact">
              <div>
                <p className="eyebrow">Activity</p>
                <h3>最近操作</h3>
              </div>
              <Link href="/admin/logs" className="admin-text-link">
                查看日志
              </Link>
            </div>
            <div className="admin-activity-list">
              {recentLogs.length ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="admin-activity-item">
                    <span>{log.summary}</span>
                    <small>
                      {log.action} · {log.createdAt.toLocaleDateString("zh-CN")}
                    </small>
                  </div>
                ))
              ) : (
                <div className="empty-state">暂无操作记录。</div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <p className="admin-overview-version">{appVersion}</p>
    </AdminShell>
  );
}
