import { useMemo, useState } from 'react';
import { LifeBuoy, Plus, RefreshCw, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useServiceTicketMutations } from '../hooks/useServiceTicketMutations';
import { useServiceTickets } from '../hooks/useServiceTickets';
import type { ServiceTicket } from '../types';
import { CreateTicketDialog } from './CreateTicketDialog';
import { TicketBoard } from './TicketBoard';
import { TicketDetailDialog } from './TicketDetailDialog';

export function ServiceTicketsPage() {
  const { tickets, loading, error } = useServiceTickets();
  const { changeStatus } = useServiceTicketMutations();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tickets;
    return tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        (t.assigneeName ?? '').toLowerCase().includes(term) ||
        t.createdByName.toLowerCase().includes(term)
    );
  }, [tickets, search]);

  // The selected ticket is resolved from the live subscription so the detail
  // dialog stays real-time (status moves, new attachments, comment counts).
  const selectedTicket: ServiceTicket | null = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) ?? null,
    [tickets, selectedTicketId]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Service Tickets</h1>
            <p className="text-[12.5px] text-muted-foreground">
              Raise and track issues across the site and CMS — assign, discuss, resolve.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets…"
              className="h-9 w-[220px] pl-8"
            />
          </div>
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      </div>

      {/* Board */}
      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[260px] shrink-0 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-[90px] w-full rounded-lg" />
              <Skeleton className="h-[90px] w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive" className="max-w-xl">
          <RefreshCw className="h-4 w-4" />
          <AlertTitle>Could not load service tickets</AlertTitle>
          <AlertDescription>
            {error.message || 'Check your connection and refresh the page.'}
          </AlertDescription>
        </Alert>
      ) : tickets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium">No tickets yet</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Raise the first ticket when something is missing, broken, or not syncing.
            </p>
          </div>
          <Button className="mt-1 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>
      ) : (
        <TicketBoard
          tickets={filteredTickets}
          onCardClick={(ticket) => setSelectedTicketId(ticket.id)}
          onStatusChange={(ticketId, status) => {
            void changeStatus(ticketId, status);
          }}
        />
      )}

      <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TicketDetailDialog
        ticket={selectedTicket}
        open={selectedTicket !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTicketId(null);
        }}
      />
    </div>
  );
}
