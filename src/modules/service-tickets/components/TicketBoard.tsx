import { useState } from 'react';
import { toast } from 'sonner';
import type { ServiceTicket, TicketStatus } from '../types';
import { TICKET_STATUSES, TICKET_STATUS_META, isValidTicketStatusTransition } from '../types';
import { TicketColumn } from './TicketColumn';

interface TicketBoardProps {
  tickets: ServiceTicket[];
  onCardClick: (ticket: ServiceTicket) => void;
  onStatusChange: (ticketId: string, status: TicketStatus) => void;
}

export function TicketBoard({ tickets, onCardClick, onStatusChange }: TicketBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    setDraggedId(ticketId);
    e.dataTransfer.setData('text/plain', ticketId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDraggedId(null);

  const handleDrop = (e: React.DragEvent, targetStatus: TicketStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);
    if (!id) return;

    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticket.status === targetStatus) return;

    if (!isValidTicketStatusTransition(ticket.status, targetStatus)) {
      toast.error('Invalid status change', {
        description: `Cannot move from "${TICKET_STATUS_META[ticket.status].label}" to "${TICKET_STATUS_META[targetStatus].label}".`,
      });
      return;
    }

    onStatusChange(id, targetStatus);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin">
      {TICKET_STATUSES.map((status) => (
        <TicketColumn
          key={status}
          status={status}
          tickets={tickets.filter((t) => t.status === status)}
          draggedId={draggedId}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
