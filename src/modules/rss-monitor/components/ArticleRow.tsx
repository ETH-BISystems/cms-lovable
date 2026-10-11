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
import { SourceBadge } from './SourceBadge';
import { TopicPill } from './TopicPill';

export interface ArticleRowProps {
  article: RSSArticle;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDismiss?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
  onResearch?: (id: string) => void;
}

function formatShortDate(timestamp: { toDate: () => Date }): string {
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function ArticleRow({
  article,
  isSelected,
  onSelect,
  onDismiss,
  onRestore,
  onDelete,
 onResearch,
}: ArticleRowProps) {
  const handleArticleClick = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const isDismissed = article.status === 'dismissed';

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      {/* Checkbox */}
      <td className="p-3 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(article.id)}
          aria-label={`Select ${article.title}`}
        />
      </td>

      {/* Title / Source */}
      <td className="p-3">
        <div className="flex items-center gap-2">
          <SourceBadge abbreviation={article.sourceAbbreviation} />
          <div className="min-w-0">
            <button
              type="button"
              className="text-left"
              onClick={handleArticleClick}
            >
              <span className="text-sm font-medium line-clamp-1 hover:text-primary cursor-pointer">
                {article.title}
              </span>
            </button>
            <span className="text-xs text-muted-foreground">{article.source}</span>
          </div>
        </div>
      </td>

      {/* AI Score */}
      <td className="p-3">
        <AIScoreBadge score={article.aiScore} rationale={article.aiRationale} />
      </td>

      {/* KD */}
      <td className="p-3 w-32">
        <KDMetric status={article.keywordMetricsStatus} value={article.keywordDifficulty} />
      </td>

      {/* Search Volume */}
      <td className="p-3 text-sm text-right">
        <SearchVolumeMetric status={article.keywordMetricsStatus} value={article.searchVolume} />
      </td>

      {/* Content Type */}
      <td className="p-3">
        <ContentTypePill contentType={article.contentType} />
      </td>

      {/* Topics */}
      <td className="p-3">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {article.topics.slice(0, 2).map((topic) => (
            <TopicPill key={topic} topic={topic} />
          ))}
          {article.topics.length > 2 && (
            <span className="text-xs text-muted-foreground">+{article.topics.length - 2}</span>
          )}
        </div>
      </td>

      {/* Published Date */}
      <td className="p-3 text-sm text-muted-foreground whitespace-nowrap">
        {formatShortDate(article.publishedAt)}
      </td>

      {/* Actions */}
      <td className="p-3">
        <div className="flex items-center gap-1 justify-end">
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
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={article.status === 'researching' || !onResearch}
                      onClick={() => onResearch?.(article.id)}
                    >
                      <Search className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{article.status === 'researching' ? 'Already in the article pipeline' : 'Create a pipeline article from this item'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {onDismiss && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDismiss(article.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
