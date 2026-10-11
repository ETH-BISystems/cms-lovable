import { differenceInDays } from 'date-fns';
import { GripVertical, CalendarPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import type { UnscheduledArticle } from '../hooks/useUnscheduledArticles';

interface NeedsSchedulingPanelProps {
  articles: UnscheduledArticle[];
  onArticleClick?: (article: UnscheduledArticle) => void;
  onDragStart?: (e: React.DragEvent, article: UnscheduledArticle) => void;
}

export function NeedsSchedulingPanel({
  articles,
  onArticleClick,
  onDragStart,
}: NeedsSchedulingPanelProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <CalendarPlus className="h-3.5 w-3.5 text-accent" />
        Needs Scheduling
        {articles.length > 0 && (
          <Badge variant="accent" className="text-[10px] px-1.5 ml-auto">
            {articles.length}
          </Badge>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center animate-fade-in">
          <CalendarPlus className="h-4 w-4 text-muted-foreground/50" />
          <p className="text-[12px] text-muted-foreground">
            All approved articles are scheduled
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {articles.map((article) => {
            const daysSinceApproval = article.approvedDate
              ? differenceInDays(new Date(), article.approvedDate)
              : 0;
            const isOverdue = daysSinceApproval > 3;

            return (
              <div
                key={article.id}
                draggable
                onDragStart={(e) => onDragStart?.(e, article)}
                className="flex items-center gap-1.5 rounded-lg p-1.5 hover:bg-muted/50 text-xs cursor-grab active:cursor-grabbing active:shadow-raised transition-all"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <button
                  onClick={() => onArticleClick?.(article)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="font-medium truncate">{article.title}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span
                      className={cn(isOverdue && 'text-destructive font-medium')}
                    >
                      {daysSinceApproval}d ago
                    </span>
                    <StatusBadge
                      status={article.priority}
                      className="text-[10px] px-1.5 py-0"
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
