import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ServiceTicket, TicketStatus } from '../types';
import { TICKET_STATUS_META } from '../types';
import { TicketCard } from './TicketCard';

interface TicketColumnProps {
  status: TicketStatus;
  tickets: ServiceTicket[];
  draggedId: string | null;
  onDragStart: (e: React.DragEvent, ticketId: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, status: TicketStatus) => void;
  onCardClick: (ticket: ServiceTicket) => void;
}

export function TicketColumn({
  status,
  tickets,
  draggedId,
  onDragStart,
  onDragEnd,
  onDrop,
  onCardClick,
}: TicketColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const meta = TICKET_STATUS_META[status];

  return (
    <div
      className={cn(
        'flex w-[260px] shrink-0 flex-col rounded-xl border border-border/60 bg-muted/40 transition-colors',
        dragOver && 'border-primary/60 bg-primary/5'
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        onDrop(e, status);
      }}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
        <h3 className="text-[12.5px] font-semibold text-foreground">{meta.label}</h3>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
          {tickets.length}
        </span>
      </div>

      <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {tickets.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 p-4">
            <p className="text-center text-[11px] text-muted-foreground">
              {status === 'archived' ? 'No archived tickets' : 'Drop tickets here'}
            </p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              dragging={draggedId === ticket.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
