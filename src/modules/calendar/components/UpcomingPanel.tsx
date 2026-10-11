import { useMemo } from 'react';
import { format, isToday, isFuture } from 'date-fns';
import { CalendarCheck } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { CalendarEvent } from '../types';

interface UpcomingPanelProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function UpcomingPanel({ events, onEventClick }: UpcomingPanelProps) {
  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => !e.tentative && (isToday(e.date) || isFuture(e.date)))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [events]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <CalendarCheck className="h-3.5 w-3.5 text-accent" />
        Upcoming
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-4 text-center animate-fade-in">
          <CalendarCheck className="h-4 w-4 text-muted-foreground/50" />
          <p className="text-[12px] text-muted-foreground">
            No upcoming confirmed events
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {upcomingEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="w-full text-left flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/50 text-xs transition-colors"
            >
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={event.assignee.avatar} alt={event.assignee.name} />
                <AvatarFallback className="text-[8px]">
                  {event.assignee.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{event.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(event.date, 'MMM d')}
                  {event.publishTime && ` at ${event.publishTime}`}
                </p>
              </div>
              <StatusBadge status={event.status} className="text-[10px] shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
