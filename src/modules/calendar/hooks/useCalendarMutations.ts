import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  callCreateCalendarEvent,
  callUpdateCalendarEvent,
  callDeleteCalendarEvent,
  callSyncCalendarWithPipeline,
  callAutoScheduleArticles,
  callUndoAutoSchedule,
} from '../services/calendarService';
import type {
  CreateCalendarEventInput,
  CreateCalendarEventOutput,
  UpdateCalendarEventInput,
  UpdateCalendarEventOutput,
  DeleteCalendarEventOutput,
  SyncCalendarInput,
  SyncCalendarOutput,
  AutoScheduleInput,
  AutoScheduleOutput,
  UndoAutoScheduleOutput,
} from '../types';

export function useCalendarMutations() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Record<string, Error | null>>({});

  const withLoading = useCallback(
    async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      setLoading((prev) => ({ ...prev, [key]: true }));
      setError((prev) => ({ ...prev, [key]: null }));
      try {
        const result = await fn();
        setLoading((prev) => ({ ...prev, [key]: false }));
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError((prev) => ({ ...prev, [key]: e }));
        setLoading((prev) => ({ ...prev, [key]: false }));
        throw e;
      }
    },
    []
  );

  const createEvent = useCallback(
    async (input: CreateCalendarEventInput): Promise<CreateCalendarEventOutput> => {
      try {
        const result = await withLoading('createEvent', () =>
          callCreateCalendarEvent(input)
        );
        toast.success('Event created successfully');
        return result;
      } catch (err) {
        toast.error('Failed to create event');
        throw err;
      }
    },
    [withLoading]
  );

  const updateEvent = useCallback(
    async (input: UpdateCalendarEventInput): Promise<UpdateCalendarEventOutput> => {
      try {
        const result = await withLoading('updateEvent', () =>
          callUpdateCalendarEvent(input)
        );
        toast.success('Event updated successfully');
        return result;
      } catch (err) {
        toast.error('Failed to update event');
        throw err;
      }
    },
    [withLoading]
  );

  const deleteEvent = useCallback(
    async (eventId: string): Promise<DeleteCalendarEventOutput> => {
      try {
        const result = await withLoading('deleteEvent', () =>
          callDeleteCalendarEvent({ eventId })
        );
        toast.success('Event deleted');
        return result;
      } catch (err) {
        toast.error('Failed to delete event');
        throw err;
      }
    },
    [withLoading]
  );

  const syncWithPipeline = useCallback(
    async (force?: boolean, options?: { silent?: boolean }): Promise<SyncCalendarOutput> => {
      try {
        const result = await withLoading('syncWithPipeline', () =>
          callSyncCalendarWithPipeline({ force })
        );
        if (!options?.silent) {
          toast.success(
            `Sync complete: ${result.created} created, ${result.updated} updated, ${result.removed} removed`
          );
        }
        return result;
      } catch (err) {
        if (!options?.silent) {
          toast.error('Calendar sync failed. Showing last known state.');
        }
        throw err;
      }
    },
    [withLoading]
  );

  const autoSchedule = useCallback(
    async (input: AutoScheduleInput): Promise<AutoScheduleOutput> => {
      try {
        // Success toast (with Undo action) is raised by the AutoScheduleModal;
        // previews are silent by design.
        return await withLoading('autoSchedule', () =>
          callAutoScheduleArticles(input)
        );
      } catch (err) {
        toast.error(
          input.preview
            ? 'Could not generate schedule proposals.'
            : 'Auto-scheduling failed. No changes were made.'
        );
        throw err;
      }
    },
    [withLoading]
  );

  const undoAutoSchedule = useCallback(
    async (undoToken: string): Promise<UndoAutoScheduleOutput> => {
      return withLoading('undoAutoSchedule', () =>
        callUndoAutoSchedule({ undoToken })
      );
    },
    [withLoading]
  );

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    syncWithPipeline,
    autoSchedule,
    undoAutoSchedule,
    loading,
    error,
  };
}
