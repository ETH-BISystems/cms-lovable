import { useState, useCallback } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { addMonths, subMonths, addWeeks, subWeeks } from 'date-fns';
import { Sparkles, RefreshCw, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useArticleDetailContext, useTeamMembers, type Priority } from '@/modules/pipeline';
import { useAuth } from '@/modules/auth';
import { CalendarProvider, useCalendarContext } from '../context/CalendarContext';
import { CalendarNavigation, type ViewMode } from './CalendarNavigation';
import { CalendarFilters } from './CalendarFilters';
import { CapacityIndicator } from './CapacityIndicator';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { PublishingQueue } from './PublishingQueue';
import { RightSidebar } from './RightSidebar';
import { ScheduleModal } from './ScheduleModal';
import { AutoScheduleModal } from './AutoScheduleModal';
import type { ContentPillActions } from './ContentPillContextMenu';
import type { CalendarEvent, ContentType, TimeSlot, AutoScheduleOutput } from '../types';
import type { UnscheduledArticle } from '../hooks/useUnscheduledArticles';
import type { AwaitingExperienceItem } from '../hooks/useAwaitingExperience';

function CalendarPageContent() {
  const {
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
    loading,
    error,
  } = useCalendarContext();

  const navigate = useNavigate();
  const { openPanel } = useArticleDetailContext();
  const { members } = useTeamMembers();
  const { role } = useAuth();
  const canDelete = role === 'admin' || role === 'editor';

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Schedule modal state
  const [scheduleModal, setScheduleModal] = useState<{
    open: boolean;
    title: string;
    date: Date;
    defaultTime?: string;
    eventId?: string;
    articleId?: string;
  }>({ open: false, title: '', date: new Date() });

  // Auto-schedule modal state
  const [autoScheduleOpen, setAutoScheduleOpen] = useState(false);
  const [proposals, setProposals] = useState<AutoScheduleOutput['scheduled']>([]);
  const [proposalsLoading, setProposalsLoading] = useState(false);

  // Drag state
  const [draggedArticle, setDraggedArticle] = useState<UnscheduledArticle | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);

  // Unschedule (delete) confirmation state
  const [unscheduleTarget, setUnscheduleTarget] = useState<CalendarEvent | null>(null);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setCurrentDate((d) =>
      viewMode === 'month' ? subMonths(d, 1) : subWeeks(d, 1)
    );
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) =>
      viewMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1)
    );
  }, [viewMode]);

  const handleToday = useCallback(() => setCurrentDate(new Date()), []);

  // Event click → article detail panel (articles/deals) or newsletter page
  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      if (event.type === 'newsletter') {
        navigate(
          event.newsletterEditionId
            ? `/newsletter?edition=${event.newsletterEditionId}`
            : '/newsletter'
        );
        return;
      }
      if (event.pipelineArticleId) {
        openPanel(event.pipelineArticleId);
      }
    },
    [navigate, openPanel]
  );

  // Reschedule via context menu or collisions panel
  const openRescheduleModal = useCallback((event: CalendarEvent) => {
    setScheduleModal({
      open: true,
      title: event.title,
      date: event.date,
      defaultTime: event.publishTime ?? '9:00 AM',
      eventId: event.id,
    });
  }, []);

  const handleRescheduleCollision = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (event) openRescheduleModal(event);
    },
    [events, openRescheduleModal]
  );

  // Context menu actions on pills
  const pillActions: ContentPillActions = {
    onOpenDetails: handleEventClick,
    onReschedule: openRescheduleModal,
    onChangePriority: (event: CalendarEvent, priority: Priority) => {
      mutations.updateEvent({ eventId: event.id, priority }).catch(() => {
        // Error toast handled by mutations hook
      });
    },
    onReassign: (event: CalendarEvent, member: { name: string; avatar: string }) => {
      mutations.updateEvent({ eventId: event.id, assignee: member }).catch(() => {
        // Error toast handled by mutations hook
      });
    },
    onChangeType: (event: CalendarEvent, type: ContentType) => {
      mutations.updateEvent({ eventId: event.id, type }).catch(() => {
        // Error toast handled by mutations hook
      });
    },
    onChangeCluster: (event: CalendarEvent, cluster: string | null) => {
      mutations.updateEvent({ eventId: event.id, topicCluster: cluster }).catch(() => {
        // Error toast handled by mutations hook
      });
    },
    onUnschedule: canDelete ? (event: CalendarEvent) => setUnscheduleTarget(event) : undefined,
    teamMembers: members.map((m) => ({ name: m.name, avatar: m.avatar })),
  };

  // Confirmed unschedule → delete the event (clears the linked article's
  // schedule server-side, so it returns to Needs Scheduling)
  const handleUnscheduleConfirm = useCallback(async () => {
    if (!unscheduleTarget) return;
    const eventId = unscheduleTarget.id;
    setUnscheduleTarget(null);
    try {
      await mutations.deleteEvent(eventId);
    } catch {
      // Error toast handled by mutations hook
    }
  }, [unscheduleTarget, mutations]);

  // Drop handlers
  const handleDropOnDate = useCallback(
    (date: Date) => {
      if (draggedArticle) {
        setScheduleModal({
          open: true,
          title: draggedArticle.title,
          date,
          defaultTime: '9:00 AM',
          articleId: draggedArticle.id,
        });
        setDraggedArticle(null);
      } else if (draggedEvent) {
        setScheduleModal({
          open: true,
          title: draggedEvent.title,
          date,
          defaultTime: draggedEvent.publishTime ?? '9:00 AM',
          eventId: draggedEvent.id,
        });
        setDraggedEvent(null);
      }
    },
    [draggedArticle, draggedEvent]
  );

  const handleDropOnSlot = useCallback(
    (date: Date, timeSlot: TimeSlot) => {
      const defaultTimes: Record<TimeSlot, string> = {
        morning: '9:00 AM',
        afternoon: '1:00 PM',
        evening: '6:00 PM',
      };

      if (draggedArticle) {
        setScheduleModal({
          open: true,
          title: draggedArticle.title,
          date,
          defaultTime: defaultTimes[timeSlot],
          articleId: draggedArticle.id,
        });
        setDraggedArticle(null);
      } else if (draggedEvent) {
        setScheduleModal({
          open: true,
          title: draggedEvent.title,
          date,
          defaultTime: draggedEvent.publishTime ?? defaultTimes[timeSlot],
          eventId: draggedEvent.id,
        });
        setDraggedEvent(null);
      }
    },
    [draggedArticle, draggedEvent]
  );

  // Schedule confirm handler
  const handleScheduleConfirm = useCallback(
    async (date: Date, time: string) => {
      try {
        if (scheduleModal.eventId) {
          await mutations.updateEvent({
            eventId: scheduleModal.eventId,
            date: date.toISOString(),
            publishTime: time,
          });
        } else if (scheduleModal.articleId) {
          await mutations.createEvent({
            title: scheduleModal.title,
            type: 'article',
            date: date.toISOString(),
            publishTime: time,
            assignee: { name: 'Unassigned', avatar: '' },
            priority: 'Medium',
            pipelineArticleId: scheduleModal.articleId,
          });
        }
      } catch {
        // Error toast handled by mutations hook
      }
      setScheduleModal((prev) => ({ ...prev, open: false }));
    },
    [scheduleModal, mutations]
  );

  // Drag start handlers
  const handleUnscheduledDragStart = useCallback(
    (_e: React.DragEvent, article: UnscheduledArticle) => {
      setDraggedArticle(article);
    },
    []
  );

  const handleEventDragStart = useCallback(
    (_e: React.DragEvent, event: CalendarEvent) => {
      setDraggedEvent(event);
    },
    []
  );

  // Needs Scheduling panel: clicking a title opens the schedule modal for today
  const handleUnscheduledClick = useCallback((article: UnscheduledArticle) => {
    setScheduleModal({
      open: true,
      title: article.title,
      date: new Date(),
      defaultTime: '9:00 AM',
      articleId: article.id,
    });
  }, []);

  // Awaiting Experience panel: Record Now opens the article detail panel
  const handleRecordNow = useCallback(
    (item: AwaitingExperienceItem) => {
      if (item.pipelineArticleId) openPanel(item.pipelineArticleId);
    },
    [openPanel]
  );

  // Auto-schedule: fetch a server-side preview when the modal opens
  const handleOpenAutoSchedule = useCallback(async () => {
    setAutoScheduleOpen(true);
    setProposals([]);
    const articleIds = unscheduledArticles.map((a) => a.id);
    if (articleIds.length === 0) return;

    setProposalsLoading(true);
    try {
      const result = await mutations.autoSchedule({ articleIds, preview: true });
      setProposals(result.scheduled);
    } catch {
      // Error toast handled by mutations hook
    } finally {
      setProposalsLoading(false);
    }
  }, [unscheduledArticles, mutations]);

  const handleAutoScheduleApply = useCallback(
    async (articleIds: string[]) => {
      return mutations.autoSchedule({ articleIds });
    },
    [mutations]
  );

  const handleAutoScheduleUndo = useCallback(
    async (undoToken: string) => {
      await mutations.undoAutoSchedule(undoToken);
    },
    [mutations]
  );

  // Publish handler
  const handlePublish = useCallback(
    async (event: CalendarEvent) => {
      await mutations.updateEvent({
        eventId: event.id,
        status: 'Published',
      });
    },
    [mutations]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">
          Failed to load calendar data. {error.message}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Page header */}
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-foreground">
            Editorial Calendar
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Plan, schedule, and track publishing across articles, newsletters, and deals.
          </p>
        </div>

        {/* Navigation */}
        <CalendarNavigation
          currentDate={currentDate}
          viewMode={viewMode}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onViewModeChange={setViewMode}
        />

        {/* Filters + actions row */}
        <div className="flex items-center justify-between">
          <CalendarFilters filters={filters} onFilterChange={setFilters} />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutations.syncWithPipeline(false)}
              disabled={mutations.loading['syncWithPipeline']}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Sync
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenAutoSchedule}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Auto-Schedule
            </Button>
          </div>
        </div>

        {/* Capacity indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/70 bg-card shadow-card px-4 py-3">
            <CapacityIndicator
              label="Weekly"
              current={capacity.weeklyScheduled}
              target={capacity.weeklyTarget}
            />
          </div>
          <div className="rounded-xl border border-border/70 bg-card shadow-card px-4 py-3">
            <CapacityIndicator
              label="Monthly"
              current={capacity.monthlyScheduled}
              target={capacity.monthlyTarget}
            />
          </div>
        </div>

        {/* Empty state note — grid stays mounted so drag-and-drop still works */}
        {filteredEvents.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-6 border border-dashed border-border/80 rounded-xl bg-card/60 animate-fade-in">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
              <CalendarDays className="h-5 w-5 text-accent" />
            </div>
            <p className="text-[14px] font-semibold text-foreground">
              Nothing scheduled this period
            </p>
            <p className="text-[12px] text-muted-foreground">
              Drag articles from “Needs Scheduling” onto a day to get started
            </p>
          </div>
        )}

        {/* Calendar grid */}
        {viewMode === 'month' ? (
          <MonthView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
            pillActions={pillActions}
            onDropOnDate={handleDropOnDate}
            onEventDragStart={handleEventDragStart}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
            pillActions={pillActions}
            onDropOnSlot={handleDropOnSlot}
            onEventDragStart={handleEventDragStart}
          />
        )}

        {/* Publishing Queue */}
        <PublishingQueue
          events={events}
          onEventClick={handleEventClick}
          onPublish={handlePublish}
        />
      </div>

      {/* Right sidebar */}
      <RightSidebar
        events={events}
        unscheduledArticles={unscheduledArticles}
        awaitingExperienceArticles={awaitingExperienceArticles}
        collisions={collisions}
        velocity={velocity}
        loading={loading}
        onEventClick={handleEventClick}
        onUnscheduledClick={handleUnscheduledClick}
        onUnscheduledDragStart={handleUnscheduledDragStart}
        onRecordNow={handleRecordNow}
        onDismissCollision={dismissCollision}
        onDismissAllCollisions={dismissAll}
        onRescheduleCollision={handleRescheduleCollision}
      />

      {/* Schedule Modal */}
      <ScheduleModal
        open={scheduleModal.open}
        onOpenChange={(open) =>
          setScheduleModal((prev) => ({ ...prev, open }))
        }
        title={scheduleModal.title}
        date={scheduleModal.date}
        defaultTime={scheduleModal.defaultTime}
        onConfirm={handleScheduleConfirm}
      />

      {/* Unschedule confirmation */}
      <AlertDialog
        open={!!unscheduleTarget}
        onOpenChange={(open) => {
          if (!open) setUnscheduleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unschedule this item?</AlertDialogTitle>
            <AlertDialogDescription>
              “{unscheduleTarget?.title}” will be removed from the calendar.
              {unscheduleTarget?.pipelineArticleId
                ? ' The article keeps its pipeline status and returns to Needs Scheduling.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleUnscheduleConfirm}
            >
              Unschedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Auto-Schedule Modal */}
      <AutoScheduleModal
        open={autoScheduleOpen}
        onOpenChange={setAutoScheduleOpen}
        unscheduledCount={unscheduledArticles.length}
        onApply={handleAutoScheduleApply}
        onUndo={handleAutoScheduleUndo}
        proposedPlacements={proposals}
        loadingProposals={proposalsLoading}
      />
    </div>
  );
}

export function CalendarPage() {
  return (
    <CalendarProvider>
      <CalendarPageContent />
    </CalendarProvider>
  );
}
