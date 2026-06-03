import { DataTableLoading } from "@/components/data-table-loading";
import { AdminPageHeaderSkeleton } from "@/components/admin-page-header-skeleton";

export default function SitesLoading() {
  return (
    <>
      <AdminPageHeaderSkeleton
        eyebrow="Sites"
        title="站点列表"
        description="默认展示核心信息，展开后再编辑，避免列表被表单噪音淹没。"
        metaCount={3}
      />
      <div className="admin-loading-shell">
        <div className="admin-record-shell">
          <DataTableLoading rows={6} variant="sites" />
        </div>
      </div>
    </>
  );
}
