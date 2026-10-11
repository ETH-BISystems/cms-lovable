import { cn } from '@/lib/utils';

const SCORE_RANGES = [
  { label: '90-100', filterValue: '90-100', color: 'bg-emerald-600' },
  { label: '80-89', filterValue: '80-89', color: 'bg-success' },
  { label: '70-79', filterValue: '70-79', color: 'bg-warning' },
  { label: '60-69', filterValue: '60-69', color: 'bg-orange-400' },
  { label: 'Below 60', filterValue: 'below-60', color: 'bg-destructive' },
];

interface DistributionBucket {
  label: string;
  count: number;
}

interface ScoreDistributionProps {
  distribution: DistributionBucket[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function ScoreDistribution({
  distribution,
  activeFilter,
  onFilterChange,
}: ScoreDistributionProps) {
  const counts = SCORE_RANGES.map(
    (r, i) => distribution[i]?.count ?? 0
  );
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Score Distribution
      </h3>
      <div className="space-y-2">
        {SCORE_RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() =>
              onFilterChange(
                activeFilter === r.filterValue ? 'all' : r.filterValue
              )
            }
            className={cn(
              'flex items-center gap-3 w-full text-left group transition-opacity',
              activeFilter !== 'all' && activeFilter !== r.filterValue
                ? 'opacity-40'
                : ''
            )}
          >
            <span className="text-xs text-muted-foreground w-16">{r.label}</span>
            <div className="flex-1 h-6 bg-muted/30 rounded overflow-hidden">
              <div
                className={cn(
                  'h-full rounded flex items-center pl-2 transition-all',
                  r.color
                )}
                style={{
                  width: `${maxCount > 0 ? (counts[i] / maxCount) * 100 : 0}%`,
                  minWidth: counts[i] > 0 ? '24px' : '0',
                }}
              >
                <span className="text-xs font-bold text-white">{counts[i]}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
