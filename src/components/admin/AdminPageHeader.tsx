import Link from "next/link";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function AdminPageHeader({ title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

interface AdminSectionHeaderProps {
  title: string;
  href?: string;
  linkLabel?: string;
}

export function AdminSectionHeader({ title, href, linkLabel = "View all" }: AdminSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="admin-section-title">{title}</h2>
      {href && (
        <Link
          href={href}
          className="text-sm font-medium text-primary transition-colors hover:text-primary-light"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <div className="admin-card-muted">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
