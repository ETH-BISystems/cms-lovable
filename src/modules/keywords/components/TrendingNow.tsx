import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface TrendingQuery {
  query: string;
  badge: 'Rising' | 'New';
}

interface TrendingNowProps {
  onResearch: (query: string) => void;
  onRefresh: () => void;
}

// Placeholder trending data — in production this would come from a Cloud Function or Firestore
const TRENDING_QUERIES: TrendingQuery[] = [
  { query: 'chase sapphire preferred 100k offer', badge: 'Rising' },
  { query: 'amex platinum annual fee increase 2024', badge: 'New' },
  { query: 'best airline credit card no annual fee', badge: 'Rising' },
  { query: 'capital one venture x lounge access', badge: 'New' },
  { query: 'hotel points transfer partners', badge: 'Rising' },
];

export function TrendingNow({ onResearch, onRefresh }: TrendingNowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Trending Now</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Refresh
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TRENDING_QUERIES.map((t) => (
          <Card key={t.query} className="cursor-pointer hover:shadow-sm transition-shadow">
            <CardContent className="p-3 flex items-center gap-2">
              <span className="text-sm">{t.query}</span>
              <Badge variant={t.badge === 'Rising' ? 'default' : 'secondary'} className="text-[10px]">
                {t.badge}
              </Badge>
              <Button
                variant="link"
                size="sm"
                className="text-xs p-0 h-auto"
                onClick={(e) => { e.stopPropagation(); onResearch(t.query); }}
              >
                Research
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
