import { useState, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Trash2, AlertCircle } from 'lucide-react';
import type { EditionTask } from '../types/index';

const TASK_STATUSES = ['Pending', 'In Progress', 'Blocked', 'Complete'] as const;
const PRIORITIES = ['High', 'Medium', 'Low'] as const;
const TASK_TYPES = [
  'Content Writing',
  'Review',
  'Design',
  'Research',
  'Editing',
  'Approval',
  'Publishing',
  'Other',
];

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-500',
  Medium: 'bg-amber-500',
  Low: 'bg-green-500',
};

interface TaskDetailPanelProps {
  task: EditionTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateTask?: (taskId: string, updates: Partial<EditionTask>) => void;
  onDeleteTask?: (taskId: string) => void;
  teamMembers?: string[];
}

/**
 * Slide-in detail panel for a single task.
 *
 * Requirements: 4.4, 4.5
 */
export function TaskDetailPanel({
  task,
  open,
  onOpenChange,
  onUpdateTask,
  onDeleteTask,
  teamMembers = [],
}: TaskDetailPanelProps) {
  const [blockReasonModal, setBlockReasonModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (!task) return;
      if (newStatus === 'Blocked') {
        setPendingStatus(newStatus);
        setBlockReason(task.blockReason ?? '');
        setBlockReasonModal(true);
        return;
      }
      onUpdateTask?.(task.id, {
        status: newStatus as EditionTask['status'],
        blockReason: undefined,
      });
    },
    [task, onUpdateTask],
  );

  const confirmBlock = useCallback(() => {
    if (!task || !blockReason.trim()) return;
    onUpdateTask?.(task.id, {
      status: 'Blocked',
      blockReason: blockReason.trim(),
    });
    setBlockReasonModal(false);
    setPendingStatus(null);
  }, [task, blockReason, onUpdateTask]);

  if (!task) return null;

  const subtaskProgress =
    task.subtasks.length > 0
      ? (task.subtasks.filter((s) => s.completed).length / task.subtasks.length) * 100
      : 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">{task.title}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-4">
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              <Select
                value={task.priority}
                onValueChange={(v) =>
                  onUpdateTask?.(task.id, { priority: v as EditionTask['priority'] })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${PRIORITY_COLORS[p]}`} />
                        {p}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <Select
                value={task.type}
                onValueChange={(v) => onUpdateTask?.(task.id, { type: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignees */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Assignees</label>
              <div className="flex flex-wrap gap-1">
                {task.assignees.map((a) => (
                  <Badge key={a} variant="secondary" className="text-xs">
                    {a}
                  </Badge>
                ))}
                {task.assignees.length === 0 && (
                  <span className="text-xs text-muted-foreground">Unassigned</span>
                )}
              </div>
            </div>

            {/* Block reason */}
            {task.status === 'Blocked' && task.blockReason && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Block Reason
                </label>
                <p className="text-xs text-muted-foreground bg-destructive/5 p-2 rounded">
                  {task.blockReason}
                </p>
              </div>
            )}

            <Separator />

            {/* Subtasks */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
              </label>
              {task.subtasks.length > 0 && (
                <Progress value={subtaskProgress} className="h-1.5" />
              )}
              <div className="space-y-1">
                {task.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={subtask.completed}
                      className="h-3.5 w-3.5"
                    />
                    <span
                      className={`text-xs ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Comments ({task.comments.length})
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {task.comments.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-medium">{c.author}</span>{' '}
                    <span className="text-muted-foreground">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Textarea
                value={task.notes ?? ''}
                onChange={(e) => onUpdateTask?.(task.id, { notes: e.target.value })}
                placeholder="Add notes..."
                className="min-h-[60px] text-xs"
              />
            </div>

            <Separator />

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => onDeleteTask?.(task.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete Task
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Block reason modal */}
      <Dialog open={blockReasonModal} onOpenChange={setBlockReasonModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Block Reason Required</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for blocking this task.
            </p>
            <Input
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Why is this task blocked?"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBlockReasonModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmBlock} disabled={!blockReason.trim()}>
              Confirm Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
