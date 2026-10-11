import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { DayCell } from './DayCell';
import type { ContentPillActions } from './ContentPillContextMenu';
import type { CalendarEvent, TimeSlot } from '../types';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (e: React.MouseEvent, event: CalendarEvent) => void;
  pillActions?: ContentPillActions;
  onDropOnDate?: (date: Date) => void;
  onEventDragStart?: (e: React.DragEvent, event: CalendarEvent) => void;
}

export function MonthView({
  currentDate,
  events,
  onEventClick,
  onEventContextMenu,
  pillActions,
  onDropOnDate,
  onEventDragStart,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function getEventsForDay(day: Date): CalendarEvent[] {
    return events.filter((e) => isSameDay(e.date, day));
  }

  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40">
        {DAY_HEADERS.map((header) => (
          <div
            key={header}
            className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {header}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            date={day}
            currentMonth={currentDate}
            events={getEventsForDay(day)}
            onEventClick={onEventClick}
            onEventContextMenu={onEventContextMenu}
            pillActions={pillActions}
            onDrop={onDropOnDate}
            onEventDragStart={onEventDragStart}
          />
        ))}
      </div>
    </div>
  );
}
