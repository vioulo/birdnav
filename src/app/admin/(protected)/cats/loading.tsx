import { DataTableLoading } from "@/components/data-table-loading";
import { AdminPageHeaderSkeleton } from "@/components/admin-page-header-skeleton";

export default function CatsLoading() {
  return (
    <>
      <AdminPageHeaderSkeleton
        eyebrow="Categories"
        title="分类列表"
        description="管理前台筛选入口和链接色块，保持分类数量清晰可控。"
        metaCount={3}
      />
      <div className="admin-loading-shell">
        <div className="admin-record-shell">
          <DataTableLoading rows={6} variant="cats" />
        </div>
      </div>
    </>
  );
}
