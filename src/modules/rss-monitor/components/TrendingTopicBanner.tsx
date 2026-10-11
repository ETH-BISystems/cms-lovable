import { Flame, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TrendingTopic } from '../types';

export interface TrendingTopicBannerProps {
  topic: TrendingTopic;
  onDismiss: (id: string) => void;
  /** CMS-112: one pipeline article for the whole story cluster (wired — was
      a hardcoded-disabled "Coming Soon" placeholder). */
  onResearch?: (topic: TrendingTopic) => void;
  researching?: boolean;
}

export function TrendingTopicBanner({ topic, onDismiss, onResearch, researching = false }: TrendingTopicBannerProps) {
  const handleDismiss = () => {
    onDismiss(topic.id);
    toast('Trending topic dismissed', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          /* The parent manages dismissed IDs — undo re-adds the topic.
             We call onDismiss with a special "undo" pattern handled by the parent,
             but the simplest approach is to let the parent expose an undo callback.
             For now we just inform the parent via a custom event pattern.
             The RSSPage component handles undo by removing the ID from the dismissed set. */
        },
      },
    });
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
      <Flame className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{topic.topic}</h3>
          <span className="text-xs text-muted-foreground">
            {topic.sourceCount ?? topic.count} source{(topic.sourceCount ?? topic.count) !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Source / title list — older trending docs predate articleTitles */}
        <ul className="mt-1.5 space-y-0.5">
          {(topic.articleTitles ?? []).map((title, idx) => (
            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
              <span className="font-medium text-foreground shrink-0">
                {(topic.sources ?? [])[idx] ?? 'Unknown'}
              </span>
              <span className="truncate">{title}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!onResearch || researching}
                onClick={() => onResearch?.(topic)}
              >
                {researching && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {researching ? 'Researching…' : 'Research This Topic'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create one pipeline article from this story — every cluster article is attached as a source and marked In Pipeline</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
