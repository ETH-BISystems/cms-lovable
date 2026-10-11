import { MessageSquare, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceTicket } from '../types';
import { formatTicketDate, getAvatarColor, getInitials } from '../utils/ticketFormat';

interface TicketCardProps {
  ticket: ServiceTicket;
  dragging: boolean;
  onDragStart: (e: React.DragEvent, ticketId: string) => void;
  onDragEnd: () => void;
  onClick: (ticket: ServiceTicket) => void;
}

export function TicketCard({ ticket, dragging, onDragStart, onDragEnd, onClick }: TicketCardProps) {
  const archived = ticket.status === 'archived';

  return (
    <button
      type="button"
      draggable={!archived}
      onDragStart={(e) => onDragStart(e, ticket.id)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(ticket)}
      className={cn(
        'w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all',
        'hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        dragging && 'opacity-50',
        archived ? 'cursor-default opacity-70' : 'cursor-grab active:cursor-grabbing'
      )}
    >
      <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-3">
        {ticket.title}
      </p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          {ticket.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {ticket.attachments.length}
            </span>
          )}
          {ticket.commentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {ticket.commentCount}
            </span>
          )}
          <span>{formatTicketDate(ticket.createdAt)}</span>
        </div>

        {ticket.assigneeName ? (
          <span
            title={`Assigned to ${ticket.assigneeName}`}
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold text-white',
              getAvatarColor(ticket.assigneeName)
            )}
          >
            {getInitials(ticket.assigneeName)}
          </span>
        ) : (
          <span
            title="Unassigned"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-[9.5px] text-muted-foreground"
          >
            —
          </span>
        )}
      </div>
    </button>
  );
}
