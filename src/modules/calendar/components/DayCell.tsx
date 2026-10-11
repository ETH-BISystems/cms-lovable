import { useState } from 'react';
import { isToday, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContentPill } from './ContentPill';
import { ContentPillContextMenu, type ContentPillActions } from './ContentPillContextMenu';
import type { CalendarEvent } from '../types';

const MAX_VISIBLE_PILLS = 3;

interface DayCellProps {
  date: Date;
  currentMonth: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
  pillActions?: ContentPillActions;
  onDrop?: (date: Date) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onEventDragStart?: (e: React.DragEvent, event: CalendarEvent) => void;
}

export function DayCell({
  date,
  currentMonth,
  events,
  onEventClick,
  onEventContextMenu,
  pillActions,
  onDrop,
  onDragOver,
  onEventDragStart,
}: DayCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isCurrentDay = isToday(date);
  const visibleEvents = events.slice(0, MAX_VISIBLE_PILLS);
  const overflowCount = events.length - MAX_VISIBLE_PILLS;

  return (
    <div
      className={cn(
        'min-h-[100px] border-[0.5px] border-border/60 bg-card p-1.5 text-xs transition-colors hover:bg-muted/30',
        !isCurrentMonth && 'bg-muted/20 opacity-45',
        isCurrentDay && 'bg-accent/5 ring-1 ring-inset ring-accent/25',
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
        onDrop?.(date);
      }}
    >
      {/* Day number */}
      <div className="flex justify-end mb-0.5">
        <span
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-muted-foreground',
            isCurrentDay && 'bg-accent/10 text-accent font-semibold'
          )}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Event pills */}
      <div className="space-y-0.5">
        {visibleEvents.map((event) => (
          <ContentPillContextMenu key={event.id} event={event} actions={pillActions}>
            <div>
              <ContentPill
                event={event}
                onClick={onEventClick}
                onContextMenu={onEventContextMenu}
                draggable
                onDragStart={onEventDragStart}
              />
            </div>
          </ContentPillContextMenu>
        ))}

        {overflowCount > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-[10px] font-medium text-muted-foreground hover:text-accent w-full text-left px-1 rounded transition-colors">
                +{overflowCount} more
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 space-y-1" align="start">
              {events.map((event) => (
                <ContentPillContextMenu key={event.id} event={event} actions={pillActions}>
                  <div>
                    <ContentPill
                      event={event}
                      onClick={onEventClick}
                      onContextMenu={onEventContextMenu}
                    />
                  </div>
                </ContentPillContextMenu>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
