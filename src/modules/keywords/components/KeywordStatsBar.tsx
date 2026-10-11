import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, FileX, TrendingDown, Sparkles } from 'lucide-react';

interface KeywordStatsBarProps {
  stats: {
    total: number;
    noContent: number;
    underperforming: number;
    newThisWeek: number;
  };
  loading?: boolean;
}

const STAT_ITEMS = [
  { key: 'total' as const, label: 'Total Opportunities', icon: Target, color: 'text-blue-600' },
  { key: 'noContent' as const, label: 'No ETH Content', icon: FileX, color: 'text-red-600' },
  { key: 'underperforming' as const, label: 'ETH Underperforming', icon: TrendingDown, color: 'text-orange-600' },
  { key: 'newThisWeek' as const, label: 'New This Week', icon: Sparkles, color: 'text-green-600' },
];

export function KeywordStatsBar({ stats, loading }: KeywordStatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STAT_ITEMS.map(({ key, label, icon: Icon, color }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`p-2 rounded-lg bg-muted ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              {loading ? (
                <Skeleton className="h-7 w-16 mb-1" />
              ) : (
                <p className="text-2xl font-bold tabular-nums">{stats[key].toLocaleString()}</p>
              )}
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
