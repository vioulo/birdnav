import { DataTableLoading } from "@/components/data-table-loading";

export default function AdminLoading() {
  return (
    <div className="admin-loading-shell">
      <div className="admin-record-shell">
        <DataTableLoading rows={6} />
      </div>
    </div>
  );
}
