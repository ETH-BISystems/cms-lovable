import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ContentPillExpanded } from './ContentPillExpanded';
import { ContentPillContextMenu, type ContentPillActions } from './ContentPillContextMenu';
import type { CalendarEvent, TimeSlot } from '../types';

interface TimeSlotCellProps {
  date: Date;
  timeSlot: TimeSlot;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
  pillActions?: ContentPillActions;
  onDrop?: (date: Date, timeSlot: TimeSlot) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onEventDragStart?: (e: React.DragEvent, event: CalendarEvent) => void;
}

export function TimeSlotCell({
  date,
  timeSlot,
  events,
  onEventClick,
  onEventContextMenu,
  pillActions,
  onDrop,
  onDragOver,
  onEventDragStart,
}: TimeSlotCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={cn(
        'min-h-[120px] border-[0.5px] border-border/60 bg-card p-1.5 space-y-1 transition-colors hover:bg-muted/30',
        isDragOver && 'bg-accent/10 ring-1 ring-inset ring-accent/40'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragOver?.(e);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop?.(date, timeSlot);
      }}
    >
      {events.map((event) => (
        <ContentPillContextMenu key={event.id} event={event} actions={pillActions}>
          <div>
            <ContentPillExpanded
              event={event}
              onClick={onEventClick}
              onContextMenu={onEventContextMenu}
              draggable
              onDragStart={onEventDragStart}
            />
          </div>
        </ContentPillContextMenu>
      ))}
    </div>
  );
}
