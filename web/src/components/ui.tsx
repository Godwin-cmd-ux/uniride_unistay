import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

const tones: Record<string, string> = {
  COMPLETED: 'success',
  ACTIVE: 'success',
  VERIFIED: 'success',
  APPROVED: 'success',
  ACCEPTED: 'info',
  DRIVER_EN_ROUTE: 'info',
  ON_TRIP: 'info',
  ON_ROAD: 'info',
  IDLE: 'success',
  READ: 'success',
  RESOLVED: 'success',
  REQUESTED: 'warn',
  PENDING: 'warn',
  IN_REVIEW: 'warn',
  OPEN: 'warn',
  NEW: 'warn',
  CANCELLED: 'danger',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  DECLINED: 'danger',
  DISMISSED: 'danger',
  WITHDRAWN: 'muted',
  OFFLINE: 'muted',
  ARCHIVED: 'muted',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = tones[status] ?? 'muted';
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" />
      {label ?? status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: IconName;
  tone?: 'default' | 'green' | 'amber';
}) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        {icon && <Icon name={icon} size={18} />}
      </div>
      <strong>{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function EmptyState({
  icon = 'spark',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <Link href={action.href} className="btn btn-primary btn-sm">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="loading">
      <span className="spinner" />
      {label}…
    </div>
  );
}

export function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="card-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton skeleton-img" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
