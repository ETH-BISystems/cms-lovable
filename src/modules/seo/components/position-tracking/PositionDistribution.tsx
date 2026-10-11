import { cn } from '@/lib/utils';

const POSITION_GROUPS = [
  { label: '#1-3', filterValue: '1-3', color: 'bg-accent' },
  { label: '#4-10', filterValue: '4-10', color: 'bg-accent/70' },
  { label: '#11-20', filterValue: '11-20', color: 'bg-warning' },
  { label: '#21-50', filterValue: '21-50', color: 'bg-orange-400' },
  { label: '#51-100', filterValue: '51-100', color: 'bg-destructive' },
  { label: 'Not Ranking', filterValue: 'not-ranking', color: 'bg-muted-foreground/40' },
];

interface DistributionBucket {
  label: string;
  count: number;
}

interface PositionDistributionProps {
  distribution: DistributionBucket[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function PositionDistribution({
  distribution,
  activeFilter,
  onFilterChange,
}: PositionDistributionProps) {
  const total = distribution.reduce((sum, b) => sum + b.count, 0);

  const handleClick = (filterValue: string) => {
    onFilterChange(activeFilter === filterValue ? 'all' : filterValue);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Position Distribution</h3>
      <div className="flex h-8 rounded-lg overflow-hidden">
        {POSITION_GROUPS.map((group, i) => {
          const count = distribution[i]?.count ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <button
              key={group.label}
              onClick={() => handleClick(group.filterValue)}
              className={cn(
                group.color,
                'relative group transition-opacity',
                activeFilter !== 'all' && activeFilter !== group.filterValue
                  ? 'opacity-40'
                  : ''
              )}
              style={{ width: `${pct}%` }}
              title={`${group.label}: ${count}`}
            >
              {pct > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
        {POSITION_GROUPS.map((group, i) => {
          const count = distribution[i]?.count ?? 0;
          if (count === 0) return null;
          return (
            <span key={group.label} className="inline-flex items-center gap-1">
              <span className={cn('w-2 h-2 rounded-full', group.color)} />
              {group.label}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
