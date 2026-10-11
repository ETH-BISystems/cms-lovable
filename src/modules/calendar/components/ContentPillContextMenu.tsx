import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Eye, CalendarDays, ArrowUpDown, UserRound, Trash2, Tag, Layers } from 'lucide-react';
import type { CalendarEvent, ContentType } from '../types';
import { TOPIC_CLUSTERS } from '../types';
import type { Priority } from '@/modules/pipeline';

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];

const TYPE_LABELS: Record<ContentType, string> = {
  article: 'Blog Article',
  newsletter: 'Newsletter',
  deal: 'Deal / Alert',
};

/** Types a posting can be re-filed as (newsletter events stay sync-owned). */
const CHANGEABLE_TYPES: ContentType[] = ['article', 'deal'];

/** Handlers and data the context menu needs, threaded down from CalendarPage. */
export interface ContentPillActions {
  onOpenDetails: (event: CalendarEvent) => void;
  onReschedule: (event: CalendarEvent) => void;
  onChangePriority: (event: CalendarEvent, priority: Priority) => void;
  onReassign: (event: CalendarEvent, member: { name: string; avatar: string }) => void;
  /** Re-file the posting under a different type filter category. */
  onChangeType?: (event: CalendarEvent, type: ContentType) => void;
  /** Set/clear the topic cluster (null = Uncategorised). */
  onChangeCluster?: (event: CalendarEvent, cluster: string | null) => void;
  /** Delete/unschedule the event (admin/editor only — omit to hide the item). */
  onUnschedule?: (event: CalendarEvent) => void;
  teamMembers: Array<{ name: string; avatar: string }>;
}

interface ContentPillContextMenuProps {
  children: React.ReactNode;
  event: CalendarEvent;
  actions?: ContentPillActions;
}

export function ContentPillContextMenu({
  children,
  event,
  actions,
}: ContentPillContextMenuProps) {
  if (!actions) return <>{children}</>;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => actions.onOpenDetails(event)}>
          <Eye className="mr-2 h-4 w-4" />
          Open Details
        </ContextMenuItem>
        <ContextMenuItem onClick={() => actions.onReschedule(event)}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Reschedule
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Change Priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-36">
            {PRIORITIES.map((priority) => (
              <ContextMenuItem
                key={priority}
                disabled={priority === event.priority}
                onClick={() => actions.onChangePriority(event, priority)}
              >
                {priority}
                {priority === event.priority && (
                  <span className="ml-auto text-xs text-muted-foreground">current</span>
                )}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <UserRound className="mr-2 h-4 w-4" />
            Reassign
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            {actions.teamMembers.length === 0 ? (
              <ContextMenuItem disabled>No team members</ContextMenuItem>
            ) : (
              actions.teamMembers.map((member) => (
                <ContextMenuItem
                  key={member.name}
                  disabled={member.name === event.assignee.name}
                  onClick={() => actions.onReassign(event, member)}
                >
                  {member.name}
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
        {actions.onChangeType && event.type !== 'newsletter' && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Tag className="mr-2 h-4 w-4" />
              Change Type
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40">
              {CHANGEABLE_TYPES.map((type) => (
                <ContextMenuItem
                  key={type}
                  disabled={type === event.type}
                  onClick={() => actions.onChangeType?.(event, type)}
                >
                  {TYPE_LABELS[type]}
                  {type === event.type && (
                    <span className="ml-auto text-xs text-muted-foreground">current</span>
                  )}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {actions.onChangeCluster && event.type !== 'newsletter' && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Layers className="mr-2 h-4 w-4" />
              Change Cluster
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48">
              {TOPIC_CLUSTERS.map((cluster) => (
                <ContextMenuItem
                  key={cluster}
                  disabled={cluster === event.topicCluster}
                  onClick={() => actions.onChangeCluster?.(event, cluster)}
                >
                  {cluster}
                  {cluster === event.topicCluster && (
                    <span className="ml-auto text-xs text-muted-foreground">current</span>
                  )}
                </ContextMenuItem>
              ))}
              <ContextMenuSeparator />
              <ContextMenuItem
                disabled={!event.topicCluster}
                onClick={() => actions.onChangeCluster?.(event, null)}
              >
                None (Uncategorised)
                {!event.topicCluster && (
                  <span className="ml-auto text-xs text-muted-foreground">current</span>
                )}
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {actions.onUnschedule && event.type !== 'newsletter' && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => actions.onUnschedule?.(event)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Unschedule
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
