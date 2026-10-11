import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { usePipelineContext } from '@/modules/pipeline';
import { useAuth } from '@/modules/auth';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useCalendarFilters } from '../hooks/useCalendarFilters';
import { useUnscheduledArticles, type UnscheduledArticle } from '../hooks/useUnscheduledArticles';
import { useAwaitingExperience, type AwaitingExperienceItem } from '../hooks/useAwaitingExperience';
import { useTopicCollisions } from '../hooks/useTopicCollisions';
import { useCalendarMutations } from '../hooks/useCalendarMutations';
import { useCapacityPlanning } from '../hooks/useCapacityPlanning';
import { useContentVelocity } from '../hooks/useContentVelocity';
import { useKpiTargets } from '../hooks/useKpiTargets';
import type {
  CalendarEvent,
  CalendarFilters,
  TopicCollision,
  CapacityMetrics,
  VelocityMetrics,
  CreateCalendarEventInput,
  CreateCalendarEventOutput,
  UpdateCalendarEventInput,
  UpdateCalendarEventOutput,
  DeleteCalendarEventOutput,
  SyncCalendarOutput,
  AutoScheduleInput,
  AutoScheduleOutput,
  UndoAutoScheduleOutput,
} from '../types';

interface CalendarMutations {
  createEvent: (input: CreateCalendarEventInput) => Promise<CreateCalendarEventOutput>;
  updateEvent: (input: UpdateCalendarEventInput) => Promise<UpdateCalendarEventOutput>;
  deleteEvent: (eventId: string) => Promise<DeleteCalendarEventOutput>;
  syncWithPipeline: (force?: boolean, options?: { silent?: boolean }) => Promise<SyncCalendarOutput>;
  autoSchedule: (input: AutoScheduleInput) => Promise<AutoScheduleOutput>;
  undoAutoSchedule: (undoToken: string) => Promise<UndoAutoScheduleOutput>;
  loading: Record<string, boolean>;
  error: Record<string, Error | null>;
}

interface CalendarContextValue {
  events: CalendarEvent[];
  filteredEvents: CalendarEvent[];
  filters: CalendarFilters;
  setFilters: (update: Partial<CalendarFilters>) => void;
  unscheduledArticles: UnscheduledArticle[];
  awaitingExperienceArticles: AwaitingExperienceItem[];
  collisions: TopicCollision[];
  dismissCollision: (id: string) => void;
  dismissAll: () => void;
  mutations: CalendarMutations;
  capacity: CapacityMetrics;
  velocity: VelocityMetrics;
  loading: boolean;
  error: Error | null;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const { articles: pipelineArticles } = usePipelineContext();
  const { events, loading: eventsLoading, error: eventsError } = useCalendarEvents();
  const { filters, setFilters, applyFilters } = useCalendarFilters();
  const filteredEvents = useMemo(() => applyFilters(events), [applyFilters, events]);

  const { unscheduledArticles } = useUnscheduledArticles(pipelineArticles, events);
  const { awaitingExperienceArticles } = useAwaitingExperience(events);
  const { collisions, dismissCollision, dismissAll } = useTopicCollisions(events);
  const {
    createEvent,
    updateEvent,
    deleteEvent,
    syncWithPipeline,
    autoSchedule,
    undoAutoSchedule,
    loading: mutationsLoading,
    error: mutationsError,
  } = useCalendarMutations();
  const targets = useKpiTargets();
  const capacity = useCapacityPlanning(events, targets);
  const velocity = useContentVelocity(events, targets.weeklyTarget);

  // Reconcile pipeline articles and newsletter editions into calendar-events
  // once per mount so the calendar reflects current pipeline state without a
  // manual Sync click (Requirement 8.2). The function is admin/editor-only.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (syncedRef.current) return;
    if (role !== 'admin' && role !== 'editor') return;
    syncedRef.current = true;
    syncWithPipeline(false, { silent: true }).catch(() => {
      // Sync failure keeps the last synced state; surfaced via the manual Sync button.
    });
  }, [role, syncWithPipeline]);

  const mutations: CalendarMutations = useMemo(
    () => ({
      createEvent,
      updateEvent,
      deleteEvent,
      syncWithPipeline,
      autoSchedule,
      undoAutoSchedule,
      loading: mutationsLoading,
      error: mutationsError,
    }),
    [createEvent, updateEvent, deleteEvent, syncWithPipeline, autoSchedule, undoAutoSchedule, mutationsLoading, mutationsError]
  );

  return (
    <CalendarContext.Provider
      value={{
        events,
        filteredEvents,
        filters,
        setFilters,
        unscheduledArticles,
        awaitingExperienceArticles,
        collisions,
        dismissCollision,
        dismissAll,
        mutations,
        capacity,
        velocity,
        loading: eventsLoading,
        error: eventsError,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
}
