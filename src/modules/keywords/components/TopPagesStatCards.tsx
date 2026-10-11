import { Card, CardContent } from '@/components/ui/card';

interface TopPagesStatCardsProps {
  stats: {
    totalPages: number;
    monthlyTraffic: number;
    page1Keywords: number;
    avgAuthority: number;
  } | null;
}

export function TopPagesStatCards({ stats }: TopPagesStatCardsProps) {
  if (!stats) return null;

  const items = [
    { label: 'Total Organic Pages', value: stats.totalPages.toLocaleString() },
    { label: 'Estimated Monthly Traffic', value: stats.monthlyTraffic.toLocaleString() },
    { label: 'Page 1 Keywords', value: stats.page1Keywords.toLocaleString() },
    { label: 'Average Page Authority', value: stats.avgAuthority.toString() },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-2xl font-bold tabular-nums">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
