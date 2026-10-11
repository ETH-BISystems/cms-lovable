import { toast } from 'sonner';

interface PositionStats {
  trackedCount: number;
  onPage1Count: number;
  avgPosition: number;
  visibilityScore: number;
}

interface PositionSummaryCardsProps {
  stats: PositionStats;
}

export function PositionSummaryCards({ stats }: PositionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Tracked Keywords</p>
        <p className="text-2xl font-bold text-foreground mt-1">{stats.trackedCount}</p>
        <p
          className="text-xs text-accent mt-1 cursor-pointer hover:underline"
          onClick={() => toast.info('Add Keywords flow')}
        >
          + Add Keywords
        </p>
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">On Page 1</p>
        <p className="text-2xl font-bold text-foreground mt-1">{stats.onPage1Count}</p>
        <p className="text-xs text-success mt-1">
          of {stats.trackedCount} keywords
        </p>
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Average Position</p>
        <p className="text-2xl font-bold text-foreground mt-1">{stats.avgPosition}</p>
        <p className="text-xs text-muted-foreground mt-1">across all keywords</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Visibility Score</p>
        <p className="text-2xl font-bold text-foreground mt-1">{stats.visibilityScore}%</p>
        <p className="text-xs text-muted-foreground mt-1">Weighted by volume</p>
      </div>
    </div>
  );
}
