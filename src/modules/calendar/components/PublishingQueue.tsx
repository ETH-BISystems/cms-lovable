import { useMemo } from 'react';
import { format, addDays, isBefore, startOfDay, isToday } from 'date-fns';
import { ExternalLink, CheckCircle2, CalendarClock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CalendarEvent } from '../types';

interface PublishingQueueProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onPublish?: (event: CalendarEvent) => void;
}

export function PublishingQueue({
  events,
  onEventClick,
  onPublish,
}: PublishingQueueProps) {
  const queueEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const sevenDaysOut = addDays(today, 7);

    return events
      .filter((e) => {
        const eventDate = startOfDay(e.date);
        return eventDate >= today && eventDate <= sevenDaysOut;
      })
      .sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        // Sort by publish time within same date
        return (a.publishTime ?? '').localeCompare(b.publishTime ?? '');
      });
  }, [events]);

  // Also include overdue events (past date, not published)
  const overdueEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return events
      .filter(
        (e) => isBefore(startOfDay(e.date), today) && e.status !== 'Published'
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [events]);

  const allQueueEvents = useMemo(
    () => [...overdueEvents, ...queueEvents],
    [overdueEvents, queueEvents]
  );

  function isOverdue(event: CalendarEvent): boolean {
    return (
      isBefore(startOfDay(event.date), startOfDay(new Date())) &&
      event.status !== 'Published'
    );
  }

  function getActionButton(event: CalendarEvent) {
    if (event.status === 'Published' && event.publishedUrl) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={(e) => {
            e.stopPropagation();
            window.open(event.publishedUrl!, '_blank');
          }}
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          View Live
        </Button>
      );
    }
    if (event.status === 'Approved') {
      const isPastOrToday =
        isBefore(startOfDay(event.date), startOfDay(new Date())) ||
        isToday(event.date);
      return (
        <Button
          variant="default"
          size="sm"
          className="text-xs h-7"
          onClick={(e) => {
            e.stopPropagation();
            onPublish?.(event);
          }}
        >
          {isPastOrToday ? 'Publish Now' : 'Publish Early'}
        </Button>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <CalendarClock className="h-3.5 w-3.5 text-accent" />
        Publishing Queue — Next 7 Days
      </h3>

      {allQueueEvents.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-5 text-center animate-fade-in rounded-xl border border-dashed border-border/80 bg-card/60">
          <CalendarClock className="h-4 w-4 text-muted-foreground/50" />
          <p className="text-[12px] text-muted-foreground">
            No events scheduled in the next 7 days
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">E-E-A-T</TableHead>
                <TableHead className="text-xs">Tasks</TableHead>
                <TableHead className="text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allQueueEvents.map((event) => {
                const overdue = isOverdue(event);
                return (
                  <TableRow
                    key={event.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      overdue && 'bg-destructive/5'
                    )}
                    onClick={() => onEventClick?.(event)}
                  >
                    <TableCell className="text-xs whitespace-nowrap">
                      {overdue && (
                        <StatusBadge status="Overdue" className="text-[10px] mr-1" />
                      )}
                      {format(event.date, 'MMM d')}
                      {event.publishTime && (
                        <span className="text-muted-foreground ml-1">
                          {event.publishTime}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">
                      {event.title}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={event.status} className="text-[10px]" />
                    </TableCell>
                    <TableCell>
                      <Avatar className="h-5 w-5">
                        <AvatarImage
                          src={event.assignee.avatar}
                          alt={event.assignee.name}
                        />
                        <AvatarFallback className="text-[8px]">
                          {event.assignee.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-block h-2 w-2 rounded-full',
                          event.hasExperience ? 'bg-success' : 'bg-muted-foreground/40'
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-xs">
                      {event.tasksRemaining === 0 || event.tasksRemaining === null ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <span className="text-muted-foreground">
                          {event.tasksRemaining}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getActionButton(event)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
