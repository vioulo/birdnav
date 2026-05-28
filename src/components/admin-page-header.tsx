import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="admin-page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description ? <p className="admin-page-header-desc">{description}</p> : null}
      </div>
      {meta || actions ? (
        <div className="admin-page-header-side">
          {meta ? <div className="admin-toolbar-meta">{meta}</div> : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
