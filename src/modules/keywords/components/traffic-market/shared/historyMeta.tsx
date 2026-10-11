import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HistoryEntryMeta } from '../../../types/trafficMarket';
import { formatCompact } from './trafficFormat';

/** "2026-07-12T10:04:00Z" → "2h ago" / "3d ago" / locale date. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return iso;
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** { rows: 940, keywords: 3200 } → "940 rows · 3.2K keywords". */
export function formatResultCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .map(([key, value]) => `${formatCompact(value)} ${key}`)
    .join(' · ');
}

export const PROVIDER_LABELS: Record<HistoryEntryMeta['provider'], string> = {
  dataforseo: 'DataForSEO',
  similarweb: 'Similarweb',
  mixed: 'Mixed',
};

export function ProviderBadge({ provider }: { provider: HistoryEntryMeta['provider'] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'shrink-0 font-normal',
        provider === 'dataforseo' && 'border-teal-500/30 bg-teal-500/10 text-teal-700',
      )}
    >
      {PROVIDER_LABELS[provider]}
    </Badge>
  );
}
