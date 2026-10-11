import { Button } from '@/components/ui/button';
import { Download, Bookmark, Search } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onExportCsv: () => void;
  onTrack: () => void;
  onResearchSelected: () => void;
  canPerformActions: boolean;
}

export function BulkActionBar({
  selectedCount,
  onExportCsv,
  onTrack,
  onResearchSelected,
  canPerformActions,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      <span className="text-sm font-medium">
        {selectedCount} keyword{selectedCount !== 1 ? 's' : ''} selected
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {canPerformActions && (
          <>
            <Button variant="outline" size="sm" onClick={onExportCsv}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onTrack}>
              <Bookmark className="h-4 w-4 mr-1" />
              Track
            </Button>
            <Button size="sm" onClick={onResearchSelected}>
              <Search className="h-4 w-4 mr-1" />
              Research Selected
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
