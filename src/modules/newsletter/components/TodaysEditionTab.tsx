import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Calendar,
  Users,
  PlusCircle,
} from 'lucide-react';
import { StatusBadge } from './shared/StatusBadge';
import { RoleGate } from './shared/RoleGate';
import { NewsletterBlockEditor } from './NewsletterBlockEditor';
import { VoiceNoteSection } from './VoiceNoteSection';
import { CommentsSection } from './CommentsSection';
import { ActivityLog } from './ActivityLog';
import { TaskDetailPanel } from './TaskDetailPanel';
import { useNewsletterContext } from '../context/NewsletterContext';
import { useEditionDetail } from '../hooks/useEditionDetail';
import { useEditionTasks } from '../hooks/useEditionTasks';
import { useEditionMutations } from '../hooks/useEditionMutations';
import { hasMinimumRole } from '../services/statusMachine';
import type { EditionTask } from '../types/index';

interface TodaysEditionTabProps {
  onCreateEdition?: () => void;
}

/**
 * Full editing interface for the current/selected edition.
 *
 * Requirements: 1.1, 3.4, 4.1, 13.1, 13.3
 */
export function TodaysEditionTab({ onCreateEdition }: TodaysEditionTabProps) {
  const { selectedEditionId, userRole } = useNewsletterContext();
  const { edition, loading: editionLoading } = useEditionDetail(selectedEditionId);
  const { tasks, progress, loading: tasksLoading } = useEditionTasks(selectedEditionId);
  const { updateBlocks, manageTasks, rewriteBlock } = useEditionMutations();

  const [tasksOpen, setTasksOpen] = useState(true);
  const [selectedTask, setSelectedTask] = useState<EditionTask | null>(null);
  const [taskPanelOpen, setTaskPanelOpen] = useState(false);

  const editable = hasMinimumRole(userRole, 'Writer');

  const handleBlocksChange = useCallback(
    (blocks: import('../types/index').ContentBlock[]) => {
      if (edition) {
        updateBlocks(edition.id, blocks);
      }
    },
    [edition, updateBlocks],
  );

  const handleRewriteBlock = useCallback(
    (blockId: string) => {
      if (edition) {
        rewriteBlock(edition.id, blockId, {});
      }
    },
    [edition, rewriteBlock],
  );

  const handleTaskClick = useCallback((task: EditionTask) => {
    setSelectedTask(task);
    setTaskPanelOpen(true);
  }, []);

  const handleUpdateTask = useCallback(
    (taskId: string, updates: Partial<EditionTask>) => {
      if (!edition) return;
      manageTasks({
        editionId: edition.id,
        action: 'update',
        taskId,
        taskData: updates,
      });
    },
    [edition, manageTasks],
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      if (!edition) return;
      manageTasks({
        editionId: edition.id,
        action: 'delete',
        taskId,
      });
      setTaskPanelOpen(false);
    },
    [edition, manageTasks],
  );

  // Loading skeleton
  if (editionLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Empty state
  if (!edition) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <PlusCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Create your first edition</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Start building your newsletter by creating a new edition. Choose a type, add content blocks, and collaborate with your team.
        </p>
        <RoleGate minimumRole="Writer">
          <Button onClick={onCreateEdition}>
            <PlusCircle className="h-4 w-4 mr-2" /> New Edition
          </Button>
        </RoleGate>
      </div>
    );
  }

  const formattedDate = edition.date instanceof Date
    ? edition.date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <div className="space-y-6 p-4">
      {/* Edition header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold">{edition.subject}</h2>
          <StatusBadge status={edition.status} />
          <Badge variant="outline">{edition.editionType}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {edition.audience}
          </span>
          {edition.scheduledAt && (
            <span className="text-xs">
              Scheduled:{' '}
              {edition.scheduledAt instanceof Date
                ? edition.scheduledAt.toLocaleString()
                : ''}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Collapsible task list */}
      <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-3 py-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4" />
              Tasks ({progress.completed}/{progress.total})
            </span>
            {tasksOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-1 px-3 pb-3">
            {tasksLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No tasks yet.</p>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors text-left"
                  onClick={() => handleTaskClick(task)}
                >
                  <span
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      task.status === 'Complete'
                        ? 'bg-green-500'
                        : task.status === 'Blocked'
                          ? 'bg-red-500'
                          : task.status === 'In Progress'
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                    }`}
                  />
                  <span className="flex-1 truncate">{task.title}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {task.status}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Voice notes */}
      <VoiceNoteSection
        voiceNotes={edition.voiceNotes}
        editionId={edition.id}
        onSaveNote={async (note) => {
          try {
            const { callAddVoiceNote } = await import('../services/newsletterService');
            await callAddVoiceNote({
              editionId: edition.id,
              type: note.type,
              mode: note.mode,
              transcript: note.transcript,
              contributor: note.contributor,
              duration: note.duration || 0,
            });
          } catch {
            // toast handled by newsletterService error handler
          }
        }}
      />

      <Separator />

      {/* Block editor */}
      <div>
        <h3 className="text-sm font-medium mb-3">Content Blocks</h3>
        <NewsletterBlockEditor
          blocks={edition.blocks}
          editionId={edition.id}
          editable={editable}
          onBlocksChange={handleBlocksChange}
          onRewriteBlock={handleRewriteBlock}
        />
      </div>

      <Separator />

      {/* Comments */}
      <CommentsSection comments={edition.comments} />

      <Separator />

      {/* Activity log */}
      <ActivityLog entries={edition.activityLog} />

      {/* Task detail panel */}
      <TaskDetailPanel
        task={selectedTask}
        open={taskPanelOpen}
        onOpenChange={setTaskPanelOpen}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
}
