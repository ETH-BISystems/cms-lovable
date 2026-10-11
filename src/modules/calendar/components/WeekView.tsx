import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { TimeSlotCell } from './TimeSlotCell';
import type { ContentPillActions } from './ContentPillContextMenu';
import type { CalendarEvent, TimeSlot } from '../types';

const TIME_SLOTS: { slot: TimeSlot; label: string }[] = [
  { slot: 'morning', label: 'Morning' },
  { slot: 'afternoon', label: 'Afternoon' },
  { slot: 'evening', label: 'Evening' },
];

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
  pillActions?: ContentPillActions;
  onDropOnSlot?: (date: Date, timeSlot: TimeSlot) => void;
  onEventDragStart?: (e: React.DragEvent, event: CalendarEvent) => void;
}

export function WeekView({
  currentDate,
  events,
  onEventClick,
  onEventContextMenu,
  pillActions,
  onDropOnSlot,
  onEventDragStart,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function getEventsForSlot(day: Date, slot: TimeSlot): CalendarEvent[] {
    // Events without a publish time (e.g. newsletter editions) default to the
    // morning row so they remain visible in Week View.
    return events.filter(
      (e) => isSameDay(e.date, day) && (e.timeSlot ?? 'morning') === slot
    );
  }

  const dateRangeLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-card overflow-hidden">
      {/* Date range header */}
      <div className="text-sm font-medium text-muted-foreground py-2 text-center border-b border-border/60">
        {dateRangeLabel}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border/60 bg-muted/40">
        <div /> {/* Empty corner cell */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'py-2 text-center text-[11px] font-medium uppercase tracking-wide',
              isToday(day) ? 'text-accent' : 'text-muted-foreground'
            )}
          >
            <div>{format(day, 'EEE')}</div>
            <div
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                isToday(day) && 'bg-accent/10 text-accent font-semibold'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time slot rows */}
      {TIME_SLOTS.map(({ slot, label }) => (
        <div key={slot} className="grid grid-cols-[80px_repeat(7,1fr)]">
          <div className="flex items-center justify-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground border-[0.5px] border-border/60 bg-muted/30 p-1">
            {label}
          </div>
          {days.map((day) => (
            <TimeSlotCell
              key={`${day.toISOString()}-${slot}`}
              date={day}
              timeSlot={slot}
              events={getEventsForSlot(day, slot)}
              onEventClick={onEventClick}
              onEventContextMenu={onEventContextMenu}
              pillActions={pillActions}
              onDrop={onDropOnSlot}
              onEventDragStart={onEventDragStart}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
