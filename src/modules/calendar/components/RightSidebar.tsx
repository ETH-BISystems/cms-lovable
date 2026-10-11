import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { UpcomingPanel } from './UpcomingPanel';
import { NeedsSchedulingPanel } from './NeedsSchedulingPanel';
import { AwaitingExperiencePanel } from './AwaitingExperiencePanel';
import { TopicCollisionsPanel } from './TopicCollisionsPanel';
import { ContentVelocityPanel } from './ContentVelocityPanel';
import type { CalendarEvent, TopicCollision, VelocityMetrics } from '../types';
import type { UnscheduledArticle } from '../hooks/useUnscheduledArticles';
import type { AwaitingExperienceItem } from '../hooks/useAwaitingExperience';

interface RightSidebarProps {
  events: CalendarEvent[];
  unscheduledArticles: UnscheduledArticle[];
  awaitingExperienceArticles: AwaitingExperienceItem[];
  collisions: TopicCollision[];
  velocity: VelocityMetrics;
  loading: boolean;
  onEventClick?: (event: CalendarEvent) => void;
  onUnscheduledClick?: (article: UnscheduledArticle) => void;
  onUnscheduledDragStart?: (e: React.DragEvent, article: UnscheduledArticle) => void;
  onRecordNow?: (article: AwaitingExperienceItem) => void;
  onDismissCollision?: (id: string) => void;
  onDismissAllCollisions?: () => void;
  onRescheduleCollision?: (articleId: string) => void;
}

function SidebarSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function RightSidebar({
  events,
  unscheduledArticles,
  awaitingExperienceArticles,
  collisions,
  velocity,
  loading,
  onEventClick,
  onUnscheduledClick,
  onUnscheduledDragStart,
  onRecordNow,
  onDismissCollision,
  onDismissAllCollisions,
  onRescheduleCollision,
}: RightSidebarProps) {
  if (loading) {
    return (
      <aside className="w-72 shrink-0 border-l border-border/60 p-4 space-y-4 overflow-y-auto">
        <SidebarSkeleton />
        <Separator />
        <SidebarSkeleton />
        <Separator />
        <SidebarSkeleton />
      </aside>
    );
  }

  return (
    <aside className="w-72 shrink-0 border-l border-border/60 p-4 space-y-3 overflow-y-auto">
      <div className="rounded-xl border border-border/60 bg-card shadow-card p-3">
        <UpcomingPanel events={events} onEventClick={onEventClick} />
      </div>
      <div className="rounded-xl border border-border/60 bg-card shadow-card p-3">
        <NeedsSchedulingPanel
          articles={unscheduledArticles}
          onArticleClick={onUnscheduledClick}
          onDragStart={onUnscheduledDragStart}
        />
      </div>
      <div className="rounded-xl border border-border/60 bg-card shadow-card p-3">
        <AwaitingExperiencePanel
          articles={awaitingExperienceArticles}
          onRecordNow={onRecordNow}
        />
      </div>
      <div className="rounded-xl border border-border/60 bg-card shadow-card p-3">
        <TopicCollisionsPanel
          collisions={collisions}
          onDismiss={onDismissCollision}
          onDismissAll={onDismissAllCollisions}
          onReschedule={onRescheduleCollision}
        />
      </div>
      <div className="rounded-xl border border-border/60 bg-card shadow-card p-3">
        <ContentVelocityPanel velocity={velocity} />
      </div>
    </aside>
  );
}
