import { X, RotateCcw, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ArticleTab } from '../hooks/useArticles';

export interface BulkActionBarProps {
  tab: ArticleTab;
  selectedCount: number;
  onBulkDismiss: () => void;
  onBulkRestore: () => void;
  /** CMS-112: create one pipeline article per selected item (wired — was a
      hardcoded-disabled "Coming Soon" placeholder). */
  onBulkResearch?: () => void;
  bulkResearching?: boolean;
}

export function BulkActionBar({
  tab,
  selectedCount,
  onBulkDismiss,
  onBulkRestore,
  onBulkResearch,
  bulkResearching = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">
        {selectedCount} article{selectedCount !== 1 ? 's' : ''} selected
      </span>

      <div className="flex items-center gap-2 ml-auto">
        {tab === 'feed' && (
          <>
            <Button variant="outline" size="sm" onClick={onBulkDismiss} disabled={bulkResearching}>
              <X className="h-3.5 w-3.5 mr-1" />
              Dismiss Selected
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!onBulkResearch || bulkResearching}
                    onClick={onBulkResearch}
                  >
                    {bulkResearching ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5 mr-1" />
                    )}
                    {bulkResearching ? 'Researching…' : 'Research Selected'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a pipeline article for each selected item (items already in the pipeline are skipped)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        {tab === 'dismissed' && (
          <Button variant="outline" size="sm" onClick={onBulkRestore}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restore Selected
          </Button>
        )}
      </div>
    </div>
  );
}
