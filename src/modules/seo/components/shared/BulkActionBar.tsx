import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, actions, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-card-foreground">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={onClear}
            className="text-[11px] text-muted-foreground hover:text-card-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              size="sm"
              variant={action.variant === 'destructive' ? 'destructive' : 'default'}
              className="h-8 text-[11px]"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
