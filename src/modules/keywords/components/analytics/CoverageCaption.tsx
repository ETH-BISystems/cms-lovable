import { cn } from '@/lib/utils';
import { formatNumber } from './format';

/**
 * "Showing all X of Y {noun}" caption for the main table cards, driven by the
 * optional `totalCount` / `pulledCount` fields on seoAnalytics results. The
 * fields are read defensively (they may not exist on older snapshots or until
 * the backend ships them) — the caption renders nothing when either is absent.
 */
export function CoverageCaption({ data, noun, className }: { data: unknown; noun: string; className?: string }) {
  const counts = (data ?? null) as { totalCount?: number | null; pulledCount?: number | null } | null;
  const totalCount = counts?.totalCount;
  const pulledCount = counts?.pulledCount;
  if (totalCount == null || pulledCount == null) return null;

  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {pulledCount >= totalCount
        ? `Showing all ${formatNumber(pulledCount)} ${noun}`
        : `Showing ${formatNumber(pulledCount)} of ${formatNumber(totalCount)} ${noun}`}
    </p>
  );
}
