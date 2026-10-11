interface AIOverviewStats {
  keywordsWithAIOverview: number;
  ethCitedCount: number;
  estCtrImpact: number;
  trafficAtRisk: number;
}

interface AIOverviewSummaryCardsProps {
  stats: AIOverviewStats;
  totalKeywords: number;
}

export function AIOverviewSummaryCards({
  stats,
  totalKeywords,
}: AIOverviewSummaryCardsProps) {
  const citedPct =
    stats.keywordsWithAIOverview > 0
      ? ((stats.ethCitedCount / stats.keywordsWithAIOverview) * 100).toFixed(1)
      : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Keywords with AI Overview</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          {stats.keywordsWithAIOverview} of {totalKeywords}
        </p>
        <p className="text-xs text-warning mt-1">trending up</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">ETH Cited</p>
        <p className="text-2xl font-bold text-success mt-1">
          {stats.ethCitedCount} of {stats.keywordsWithAIOverview}
        </p>
        <p className="text-xs text-muted-foreground">{citedPct}%</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Est. CTR Impact</p>
        <p className="text-2xl font-bold text-destructive mt-1">
          {stats.estCtrImpact}%
        </p>
        <p className="text-xs text-destructive">avg reduction</p>
      </div>
      <div className="bg-card rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Traffic at Risk</p>
        <p className="text-2xl font-bold text-foreground mt-1">
          ~{Math.abs(stats.trafficAtRisk).toLocaleString()}/mo
        </p>
        <p className="text-xs text-muted-foreground">estimated</p>
      </div>
    </div>
  );
}
