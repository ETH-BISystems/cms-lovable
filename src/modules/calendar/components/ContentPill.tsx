import { differenceInDays, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '../types';
import type { ArticleStatus } from '@/modules/pipeline';

// --- Status-to-color mapping ---

const STATUS_COLOR_MAP: Record<ArticleStatus, string> = {
  Discovered: 'bg-muted text-muted-foreground',
  Researching: 'bg-purple-500/10 text-purple-700',
  Writing: 'bg-info/10 text-info',
  'In Review': 'bg-warning/15 text-amber-700',
  Approved: 'bg-sky-500/10 text-sky-700',
  Published: 'bg-success/10 text-success',
  'Needs Refresh': 'bg-destructive/10 text-destructive',
  Refreshing: 'bg-orange-500/10 text-orange-700',
  Archived: 'bg-muted text-muted-foreground',
};

function getPillColorClass(event: CalendarEvent): string {
  if (event.type === 'newsletter') return 'bg-warning/15 text-amber-700';
  if (event.type === 'deal') return 'bg-destructive/10 text-destructive';
  return STATUS_COLOR_MAP[event.status] ?? 'bg-muted text-muted-foreground';
}

function getDealCountdown(dealExpiration: Date | null): string | null {
  if (!dealExpiration) return null;
  const now = new Date();
  const daysLeft = differenceInCalendarDays(dealExpiration, now);
  if (daysLeft < 0) return 'Expired';
  if (daysLeft === 0) return 'Expires today';
  return `${daysLeft}d left`;
}

interface ContentPillProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  onContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, event: CalendarEvent) => void;
}

export function ContentPill({
  event,
  onClick,
  onContextMenu,
  draggable = false,
  onDragStart,
}: ContentPillProps) {
  const colorClass = getPillColorClass(event);
  const borderClass = event.tentative ? 'border-dashed' : 'border-solid';
  const dealCountdown = event.type === 'deal' ? getDealCountdown(event.dealExpiration) : null;
  const isExpired = dealCountdown === 'Expired';

  const label =
    event.type === 'newsletter' && event.newsletterNumber
      ? `Newsletter #${event.newsletterNumber}`
      : event.title;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, event)}
      onClick={() => onClick?.(event)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, event);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(event);
        }
      }}
      className={cn(
        'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium border truncate max-w-full transition-all duration-150 hover:shadow-card active:shadow-raised',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        event.tentative ? 'border-border/70' : 'border-transparent',
        colorClass,
        borderClass,
        isExpired && 'opacity-60'
      )}
    >
      {/* E-E-A-T dot */}
      <span
        className={cn(
          'inline-block h-1.5 w-1.5 rounded-full shrink-0',
          event.hasExperience ? 'bg-success' : 'bg-muted-foreground/40'
        )}
        title={event.hasExperience ? 'Experience sourced' : 'No experience'}
      />

      <span className="truncate">{label}</span>

      {dealCountdown && (
        <span
          className={cn(
            'ml-auto text-[10px] shrink-0',
            isExpired ? 'text-destructive font-semibold' : 'text-muted-foreground'
          )}
        >
          {dealCountdown}
        </span>
      )}
    </div>
  );
}
