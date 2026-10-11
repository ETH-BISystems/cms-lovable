import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'month' | 'week';

interface CalendarNavigationProps {
  currentDate: Date;
  viewMode: ViewMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function CalendarNavigation({
  currentDate,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewModeChange,
}: CalendarNavigationProps) {
  const dateLabel =
    viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM d, yyyy')}`;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          className="h-8 w-8 p-0 rounded-lg border-border/70 shadow-none transition-all hover:ring-2 hover:ring-accent/15 hover:border-accent/40"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          className="h-8 w-8 p-0 rounded-lg border-border/70 shadow-none transition-all hover:ring-2 hover:ring-accent/15 hover:border-accent/40"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="h-8 rounded-lg border-border/70 shadow-none text-xs transition-all hover:ring-2 hover:ring-accent/15 hover:border-accent/40"
        >
          Today
        </Button>
        <h2 className="text-[16px] font-display font-semibold tracking-tight ml-2">
          {dateLabel}
        </h2>
      </div>

      <div className="inline-flex h-9 items-center rounded-lg bg-muted/80 p-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('month')}
          className={cn(
            'h-7 rounded-md px-3 text-xs font-medium transition-all duration-150 hover:bg-transparent',
            viewMode === 'month'
              ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.08),0_1px_1px_rgb(15_23_42/0.04)] hover:bg-card'
              : 'text-muted-foreground hover:text-foreground/90'
          )}
        >
          Month
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('week')}
          className={cn(
            'h-7 rounded-md px-3 text-xs font-medium transition-all duration-150 hover:bg-transparent',
            viewMode === 'week'
              ? 'bg-card text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.08),0_1px_1px_rgb(15_23_42/0.04)] hover:bg-card'
              : 'text-muted-foreground hover:text-foreground/90'
          )}
        >
          Week
        </Button>
      </div>
    </div>
  );
}
