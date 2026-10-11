import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CalendarEvent } from '../types';

function getCardColorClass(event: CalendarEvent): string {
  if (event.type === 'newsletter') return 'bg-warning/5 border-warning/25';
  if (event.type === 'deal') return 'bg-destructive/5 border-destructive/25';
  const statusColors: Record<string, string> = {
    Discovered: 'bg-muted/40 border-border/70',
    Researching: 'bg-purple-500/5 border-purple-300/60',
    Writing: 'bg-info/5 border-info/25',
    'In Review': 'bg-warning/5 border-warning/25',
    Approved: 'bg-sky-500/5 border-sky-300/60',
    Published: 'bg-success/5 border-success/25',
    'Needs Refresh': 'bg-destructive/5 border-destructive/25',
    Refreshing: 'bg-orange-500/5 border-orange-300/60',
  };
  return statusColors[event.status] ?? 'bg-muted/40 border-border/70';
}

const PRIORITY_COLORS: Record<string, string> = {
  High: 'text-destructive',
  Medium: 'text-amber-600',
  Low: 'text-muted-foreground',
};

const REVENUE_LABELS: Record<string, string> = {
  high: '$$$ High',
  medium: '$$ Med',
  low: '$ Low',
};

interface ContentPillExpandedProps {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
  onContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, event: CalendarEvent) => void;
}

export function ContentPillExpanded({
  event,
  onClick,
  onContextMenu,
  draggable = false,
  onDragStart,
}: ContentPillExpandedProps) {
  const cardColor = getCardColorClass(event);
  const borderClass = event.tentative ? 'border-dashed' : 'border-solid';

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
        'rounded-md border p-2 space-y-1.5 text-xs transition-all duration-150 hover:shadow-card active:shadow-raised',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        cardColor,
        borderClass
      )}
    >
      {/* Header: status badge + E-E-A-T dot */}
      <div className="flex items-center gap-1.5">
        <StatusBadge status={event.status} className="text-[10px] px-1.5 py-0" />
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            event.hasExperience ? 'bg-success' : 'bg-muted-foreground/40'
          )}
        />
      </div>

      {/* Title */}
      <p className="font-medium truncate">{event.title}</p>

      {/* Meta row: assignee, priority, revenue */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Avatar className="h-4 w-4">
          <AvatarImage src={event.assignee.avatar} alt={event.assignee.name} />
          <AvatarFallback className="text-[8px]">
            {event.assignee.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className={PRIORITY_COLORS[event.priority]}>{event.priority}</span>
        {event.revenuePotential && (
          <span>{REVENUE_LABELS[event.revenuePotential] ?? event.revenuePotential}</span>
        )}
      </div>

      {/* Target keyword */}
      {event.targetKeyword && (
        <p className="text-[10px] text-muted-foreground truncate">
          🔑 {event.targetKeyword}
        </p>
      )}
    </div>
  );
}
