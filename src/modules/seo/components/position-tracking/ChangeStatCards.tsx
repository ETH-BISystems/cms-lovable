import { cn } from '@/lib/utils';

interface ChangeStats {
  improved: number;
  declined: number;
  newPage1: number;
}

interface ChangeStatCardsProps {
  changeStats: ChangeStats;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export function ChangeStatCards({
  changeStats,
  activeFilter,
  onFilterChange,
}: ChangeStatCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <button
        onClick={() =>
          onFilterChange(activeFilter === 'improved' ? 'all' : 'improved')
        }
        className={cn(
          'bg-card rounded-lg border p-4 text-left transition-colors',
          activeFilter === 'improved' ? 'border-success' : 'border-border'
        )}
      >
        <p className="text-xs text-muted-foreground">Improved</p>
        <p className="text-xl font-bold text-success">{changeStats.improved}</p>
        <p className="text-xs text-success">keywords gained positions</p>
      </button>
      <button
        onClick={() =>
          onFilterChange(activeFilter === 'declined' ? 'all' : 'declined')
        }
        className={cn(
          'bg-card rounded-lg border p-4 text-left transition-colors',
          activeFilter === 'declined' ? 'border-destructive' : 'border-border'
        )}
      >
        <p className="text-xs text-muted-foreground">Declined</p>
        <p className="text-xl font-bold text-destructive">{changeStats.declined}</p>
        <p className="text-xs text-destructive">keywords lost positions</p>
      </button>
      <button
        onClick={() => onFilterChange('all')}
        className="bg-card rounded-lg border border-border p-4 text-left"
      >
        <p className="text-xs text-muted-foreground">New Page 1</p>
        <p className="text-xl font-bold text-accent">{changeStats.newPage1}</p>
        <p className="text-xs text-accent">entered page 1 this period</p>
      </button>
    </div>
  );
}
