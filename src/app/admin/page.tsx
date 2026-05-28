import Link from "next/link";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const [userCount, categoryCount, siteCount, publishedCount, categories] =
    await Promise.all([
      prisma.user.count(),
      prisma.category.count(),
      prisma.site.count(),
      prisma.site.count({ where: { isPublished: true } }),
      prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: {
          _count: {
            select: {
              sites: true,
            },
          },
        },
      }),
    ]);

  return (
    <AdminShell currentPath="/admin" username={admin.username}>
      <AdminPageHeader
        eyebrow="Overview"
        title="导航站概览"
        description="追踪当前导航的规模、分类分布和后台操作入口。"
      />
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "管理员", value: userCount },
          { label: "分类数量", value: categoryCount },
          { label: "站点总数", value: siteCount },
          { label: "已发布", value: publishedCount },
        ].map((item) => (
          <div key={item.label} className="metric-card">
            <p className="eyebrow">{item.label}</p>
            <p className="mt-5 text-4xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="tech-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-8 py-6">
            <h3 className="text-xl font-semibold">分类分布</h3>
            <Link href="/admin/cats" className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-accent)]">
              管理分类
            </Link>
          </div>
          <div>
            {categories.map((category) => (
              <div
                key={category.id}
                className="table-row grid grid-cols-[1fr_auto] gap-4 px-8 py-5 first:border-t-0"
              >
                <div>
                  <p className="text-lg font-medium">{category.name}</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    /{category.slug}
                  </p>
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  {category._count.sites} 个站点
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="tech-panel p-8">
          <h3 className="text-xl font-semibold">快速入口</h3>
          <div className="mt-6 space-y-3">
            <Link className="button-primary block text-center" href="/admin/sites">
              添加站点
            </Link>
            <Link className="button-secondary block text-center" href="/admin/cats">
              添加分类
            </Link>
            <Link className="button-secondary block text-center" href="/">
              打开前台首页
            </Link>
          </div>
          <div className="mt-8 border border-[var(--color-line)] bg-[rgba(255,255,255,0.02)] p-5 text-sm leading-7 text-[var(--color-muted)]">
            当前 MVP 后台已支持管理员登录、分类管理、站点增删改、前台展示。
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
