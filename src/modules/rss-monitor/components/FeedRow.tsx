import {
  Pencil,
  Pause,
  Play,
  RotateCcw,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { RSSFeed, FeedStatus } from '../types';

export interface FeedRowProps {
  feed: RSSFeed;
  onEdit: (feed: RSSFeed) => void;
  onPause: (feedId: string) => void;
  onResume: (feedId: string) => void;
  onRetry: (feedId: string) => void;
  onPollNow: (feedId: string) => void;
  onDelete: (feedId: string) => void;
}

export const statusConfig: Record<FeedStatus, { color: string; label: string }> = {
  active: { color: 'bg-green-500', label: 'Active' },
  paused: { color: 'bg-yellow-500', label: 'Paused' },
  error: { color: 'bg-red-500', label: 'Error' },
};

function formatRelativeTime(timestamp: { toDate: () => Date } | null | undefined): string {
  if (!timestamp) return 'Never';
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

export function FeedRow({
  feed,
  onEdit,
  onPause,
  onResume,
  onRetry,
  onPollNow,
  onDelete,
}: FeedRowProps) {
  const { color, label } = statusConfig[feed.status];
  const isError = feed.status === 'error';

  return (
    <div className={`rounded-lg border p-4 ${isError ? 'border-red-300 bg-red-50' : 'bg-card'}`}>
      {/* Header: name + status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${color}`} aria-label={`Status: ${label}`} />
          <h4 className="text-sm font-semibold truncate">{feed.name}</h4>
          <span className="text-xs text-muted-foreground">({label})</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(feed)}>
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {feed.status === 'active' ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPause(feed.id)}>
                    <Pause className="h-3.5 w-3.5" />
                    <span className="sr-only">Pause</span>
                  </Button>
                ) : feed.status === 'paused' ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onResume(feed.id)}>
                    <Play className="h-3.5 w-3.5" />
                    <span className="sr-only">Resume</span>
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRetry(feed.id)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="sr-only">Retry</span>
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent>
                {feed.status === 'active' ? 'Pause' : feed.status === 'paused' ? 'Resume' : 'Retry'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPollNow(feed.id)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="sr-only">Poll Now</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Poll Now</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(feed.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* URL + metadata */}
      <div className="mt-2 space-y-1">
        <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Poll: {feed.pollInterval}</span>
          <span>Last polled: {formatRelativeTime(feed.lastPolled)}</span>
          <span>Total: {feed.totalIngested}</span>
          <span>Last 7d: {feed.last7DaysCount}</span>
        </div>
      </div>

      {/* Error message */}
      {isError && feed.errorMessage && (
        <div className="mt-2 flex items-start gap-2 rounded-md bg-red-100 p-2 text-xs text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="break-all select-all">{feed.errorMessage}</span>
        </div>
      )}
    </div>
  );
}
