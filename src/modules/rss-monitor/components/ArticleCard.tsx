import { X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RSSArticle } from '../types';
import { AIScoreBadge } from './AIScoreBadge';
import { KDMetric, SearchVolumeMetric } from './KDBar';
import { ContentTypePill } from './ContentTypePill';
import { SourceBadge, getSourceBorderColor } from './SourceBadge';
import { TopicPill } from './TopicPill';

export interface ArticleCardProps {
  article: RSSArticle;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDismiss?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
  onResearch?: (id: string) => void;
}

function formatRelativeDate(timestamp: { toDate: () => Date }): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function ArticleCard({
  article,
  isSelected,
  onSelect,
  onDismiss,
  onRestore,
  onDelete,
  onResearch,
}: ArticleCardProps) {
  const handleArticleClick = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const isDismissed = article.status === 'dismissed';
  const borderColor = getSourceBorderColor(article.sourceAbbreviation);

  return (
    <div className={`rounded-lg border border-l-4 ${borderColor} bg-card p-4 shadow-sm hover:shadow-md transition-shadow`}>
      {/* Header: checkbox + source badge + date */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(article.id)}
          aria-label={`Select ${article.title}`}
        />
        <SourceBadge abbreviation={article.sourceAbbreviation} />
        <div className="flex-1 min-w-0">
          <button
            type="button"
            className="text-left w-full"
            onClick={handleArticleClick}
          >
            <h3 className="text-sm font-semibold leading-tight line-clamp-2 hover:text-primary cursor-pointer">
              {article.title}
            </h3>
          </button>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{article.source}</span>
            <span>·</span>
            <span>{formatRelativeDate(article.publishedAt)}</span>
          </div>
        </div>
        <AIScoreBadge score={article.aiScore} rationale={article.aiRationale} />
      </div>

      {/* Topics + Content Type */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <ContentTypePill contentType={article.contentType} />
        {article.topics.map((topic) => (
          <TopicPill key={topic} topic={topic} />
        ))}
      </div>

      {/* KD + Search Volume */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <span className="text-xs text-muted-foreground">KD</span>
          <div>
            <KDMetric status={article.keywordMetricsStatus} value={article.keywordDifficulty} />
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Search Vol</span>
          <div>
            <SearchVolumeMetric status={article.keywordMetricsStatus} value={article.searchVolume} />
          </div>
        </div>
      </div>

      {/* Excerpt */}
      <button
        type="button"
        className="text-left w-full mt-3"
        onClick={handleArticleClick}
      >
        <p className="text-xs text-muted-foreground line-clamp-2 cursor-pointer hover:text-foreground">
          {article.excerpt}
        </p>
      </button>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
        {isDismissed && onRestore && (
          <Button variant="outline" size="sm" onClick={() => onRestore(article.id)}>
            Restore
          </Button>
        )}
        {isDismissed && onDelete && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(article.id)}>
            Delete
          </Button>
        )}
        {!isDismissed && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={article.status === 'researching' || !onResearch}
                    onClick={() => onResearch?.(article.id)}
                  >
                    <Search className="h-3.5 w-3.5 mr-1" />
                    {article.status === 'researching' ? 'In Pipeline' : 'Research'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{article.status === 'researching' ? 'Already in the article pipeline' : 'Create a pipeline article from this item'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={() => onDismiss(article.id)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Dismiss
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
