import { cn } from '@/lib/utils';

interface AuditStats {
  articlesAudited: number;
  avgScore: number;
  criticalIssues: number;
  scoring90Plus: number;
}

interface AuditSummaryCardsProps {
  stats: AuditStats;
  onFilterCritical: () => void;
  onFilter90Plus: () => void;
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-warning';
  return 'text-destructive';
}

export function AuditSummaryCards({
  stats,
  onFilterCritical,
  onFilter90Plus,
}: AuditSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Articles Audited</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          {stats.articlesAudited}
        </p>
        <p className="text-xs text-muted-foreground">Last audit: recently</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Average SEO Score</p>
        <p className={cn('text-2xl font-bold mt-1', scoreColor(stats.avgScore))}>
          {stats.avgScore}/100
        </p>
      </div>
      <button
        onClick={onFilterCritical}
        className="bg-card rounded-lg border border-border p-4 text-left hover:border-destructive transition-colors"
      >
        <p className="text-xs text-muted-foreground">Critical Issues</p>
        <p className="text-2xl font-bold text-destructive mt-1">
          {stats.criticalIssues}
        </p>
        <p className="text-xs text-destructive">articles with critical problems</p>
      </button>
      <button
        onClick={onFilter90Plus}
        className="bg-card rounded-lg border border-border p-4 text-left hover:border-success transition-colors"
      >
        <p className="text-xs text-muted-foreground">Scoring 90+</p>
        <p className="text-2xl font-bold text-success mt-1">
          {stats.scoring90Plus}
        </p>
        <p className="text-xs text-success">excellent articles</p>
      </button>
    </div>
  );
}
