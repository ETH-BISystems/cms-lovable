import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import type { NewsletterEdition } from '../../types/index';
import { Trophy, BarChart3, MousePointerClick } from 'lucide-react';

interface EditionCardProps {
  edition: NewsletterEdition;
  onClick?: (edition: NewsletterEdition) => void;
}

export function EditionCard({ edition, onClick }: EditionCardProps) {
  const formattedDate = edition.date instanceof Date
    ? edition.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick?.(edition)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header row: edition number + status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            #{edition.number}
          </span>
          <StatusBadge status={edition.status} />
        </div>

        {/* Subject line - 1-line clamp */}
        <p className="text-sm font-semibold leading-tight line-clamp-1">
          {edition.subject}
        </p>

        {/* Date + edition type */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
          <Badge variant="outline" className="text-xs">
            {edition.editionType}
          </Badge>
          {edition.audience && (
            <Badge variant="outline" className="text-xs">
              {edition.audience}
            </Badge>
          )}
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {edition.openRate !== undefined && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {edition.openRate}% open
            </span>
          )}
          {edition.clickRate !== undefined && (
            <span className="flex items-center gap-1">
              <MousePointerClick className="h-3 w-3" />
              {edition.clickRate}% click
            </span>
          )}
          {edition.abWinner && (
            <span className="flex items-center gap-1 text-amber-600">
              <Trophy className="h-3 w-3" />
              A/B Winner: {edition.abWinner}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
