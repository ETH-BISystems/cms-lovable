import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, ChevronDown, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MiniSparkline } from '../../shared/MiniSparkline';
import { ChartCard } from '../../analytics/ChartCard';
import { formatCompact, formatDeltaPct } from './trafficFormat';
import { ExternalOpen, pageHref } from './ExternalOpen';

export interface TopGrowingPagesProps {
  cards: { page: string; visits: number; changePct: number | null; trend: number[]; bucket?: string }[];
  loading?: boolean;
  emptyMessage?: string;
  title?: string;
  /** Right-aligned header controls (e.g. growing/declining/new filter). */
  actions?: ReactNode;
  /**
   * Domain the page paths belong to — enables the open-in-new-tab link on
   * each card. Omitted → path-only display (no link).
   */
  domain?: string;
}

/** Cards shown before the "View all" expander kicks in. */
const VISIBLE_LIMIT = 5;

/**
 * Headline state pill, worded by magnitude: null → "New", ≥ +50% → "Spiked"
 * (diagonal arrow), other gains → "Trending up", losses → "Declining".
 */
function HeadlinePill({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent ring-1 ring-accent/20">
        <Sparkles className="h-3 w-3" />
        New
      </span>
    );
  }
  const spiked = changePct >= 50;
  const up = changePct >= 0;
  const Icon = spiked ? ArrowUpRight : up ? TrendingUp : TrendingDown;
  const wording = spiked ? 'Spiked' : up ? 'Trending up' : 'Declining';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1',
        up ? 'bg-green-100 text-green-700 ring-green-200' : 'bg-red-100 text-red-700 ring-red-200',
      )}
    >
      <Icon className="h-3 w-3" />
      {wording} {formatDeltaPct(changePct)}
    </span>
  );
}

/**
 * Grid of top growing/declining/new page cards (Semrush "Top Pages" trending
 * strip parity): magnitude-worded state pill, mini trend sparkline, truncated
 * page path with an external-link affordance, and compact visit count —
 * wrapped in a `ChartCard`. Shows up to five cards with a "View all" expander
 * beyond that, and a graceful empty state when nothing matches.
 */
export function TopGrowingPages({
  cards,
  loading,
  emptyMessage = 'Nothing found — try changing filters.',
  title = 'Top Growing Pages',
  actions,
  domain,
}: TopGrowingPagesProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? cards : cards.slice(0, VISIBLE_LIMIT);

  return (
    <ChartCard title={title} loading={loading} skeletonHeight={180} actions={actions}>
      {cards.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {visible.map(card => (
              <div
                key={card.page}
                className="rounded-xl p-4 ring-1 ring-black/[0.06] transition-shadow duration-300 hover:shadow-[0_8px_24px_-12px_rgba(3,43,52,0.25)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <HeadlinePill changePct={card.changePct} />
                  <MiniSparkline data={card.trend} width={72} height={22} className="shrink-0" />
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <p title={card.page} className="min-w-0 truncate text-sm font-medium">
                    {card.page}
                  </p>
                  {domain && <ExternalOpen href={pageHref(domain, card.page)} label={`Open ${card.page} in a new tab`} />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">{formatCompact(card.visits)}</span>{' '}
                  visits
                </p>
              </div>
            ))}
          </div>
          {cards.length > VISIBLE_LIMIT && (
            <div className="mt-3 flex justify-center">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setExpanded(v => !v)}>
                {expanded ? 'Show less' : `View all ${cards.length}`}
                <ChevronDown
                  className={cn('ml-1 h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')}
                />
              </Button>
            </div>
          )}
        </>
      )}
    </ChartCard>
  );
}
