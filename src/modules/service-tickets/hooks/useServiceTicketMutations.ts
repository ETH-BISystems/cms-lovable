import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  addServiceTicketComment,
  assignServiceTicket,
  attachServiceTicketFile,
  createServiceTicket,
  removeServiceTicketAttachment,
  updateServiceTicketStatus,
  uploadTicketAttachment,
} from '../services/serviceTicketService';
import type { TicketStatus } from '../types';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Callable wrappers for the Service Tickets module with pending state and
 * user-facing toasts. Components call these; they never call the service
 * layer's callables directly.
 */
export function useServiceTicketMutations() {
  const [pending, setPending] = useState(false);

  const createTicket = useCallback(
    async (input: { title: string; description: string; assigneeUid: string | null }): Promise<string | null> => {
      setPending(true);
      try {
        const result = await createServiceTicket({
          title: input.title,
          description: input.description,
          assigneeUid: input.assigneeUid,
        });
        toast.success('Ticket created');
        return result.ticketId;
      } catch (error) {
        toast.error('Failed to create ticket', { description: errorMessage(error, 'Please try again.') });
        return null;
      } finally {
        setPending(false);
      }
    },
    []
  );

  const changeStatus = useCallback(async (ticketId: string, status: TicketStatus): Promise<boolean> => {
    setPending(true);
    try {
      await updateServiceTicketStatus({ ticketId, status });
      return true;
    } catch (error) {
      toast.error('Failed to update status', { description: errorMessage(error, 'Please try again.') });
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const assignTicket = useCallback(async (ticketId: string, assigneeUid: string | null): Promise<boolean> => {
    setPending(true);
    try {
      await assignServiceTicket({ ticketId, assigneeUid });
      return true;
    } catch (error) {
      toast.error('Failed to update assignee', { description: errorMessage(error, 'Please try again.') });
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const addComment = useCallback(async (ticketId: string, text: string): Promise<boolean> => {
    setPending(true);
    try {
      await addServiceTicketComment({ ticketId, text });
      return true;
    } catch (error) {
      toast.error('Failed to post comment', { description: errorMessage(error, 'Please try again.') });
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  /** Uploads the bytes to Storage, then registers the metadata on the ticket. */
  const attachFile = useCallback(async (ticketId: string, file: File): Promise<boolean> => {
    setPending(true);
    try {
      const { storagePath, downloadURL } = await uploadTicketAttachment(ticketId, file);
      await attachServiceTicketFile({
        ticketId,
        name: file.name,
        storagePath,
        downloadURL,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });
      toast.success(`${file.name} attached`);
      return true;
    } catch (error) {
      toast.error('Failed to attach file', { description: errorMessage(error, 'Please try again.') });
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const removeAttachment = useCallback(async (ticketId: string, storagePath: string): Promise<boolean> => {
    setPending(true);
    try {
      await removeServiceTicketAttachment({ ticketId, storagePath });
      toast.success('Attachment removed');
      return true;
    } catch (error) {
      toast.error('Failed to remove attachment', { description: errorMessage(error, 'Please try again.') });
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  return {
    pending,
    createTicket,
    changeStatus,
    assignTicket,
    addComment,
    attachFile,
    removeAttachment,
  };
}
