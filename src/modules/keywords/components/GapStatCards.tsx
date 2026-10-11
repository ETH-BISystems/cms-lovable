import { Card, CardContent } from '@/components/ui/card';
import type { GapAnalysisRun } from '../types';

interface GapStatCardsProps {
  analysisRun: GapAnalysisRun | null;
}

export function GapStatCards({ analysisRun }: GapStatCardsProps) {
  if (!analysisRun) return null;

  const { counts, totalGapTraffic, totalKeywordsAnalyzed } = analysisRun;
  const shared = (counts.weak ?? 0) + (counts.strong ?? 0);

  const stats = [
    { label: 'Total Gap', value: totalKeywordsAnalyzed.toLocaleString() },
    { label: 'ETH Unique', value: (counts.unique ?? 0).toLocaleString() },
    { label: 'Shared Keywords', value: shared.toLocaleString() },
    { label: 'Traffic Opportunity', value: `${totalGapTraffic.toLocaleString()}/mo` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
