import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, MessageCircle, Send, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { callManageTasks } from '../services/articleService';
import { subscribeToStore, getTaskCommentsSnapshot } from '../services/articleStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskStatus } from '../types';

// ═══════════════════════════════════════════════════════════════
// InlineDatePicker — Click to open calendar, saves on selection
// ═══════════════════════════════════════════════════════════════

interface InlineDatePickerProps {
  date: Date | null;
  onChange: (d: Date) => void;
  className?: string;
}

export function InlineDatePicker({ date, onChange, className }: InlineDatePickerProps) {
  const [open, setOpen] = useState(false);

  const formatDue = (d: Date | null) => {
    if (!d) return '—';
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    if (diff < -1) return `${Math.abs(diff)}d overdue`;
    if (diff === -1) return 'Yesterday';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return format(d, 'MMM d');
  };

  const isOverdue = date && date.getTime() < Date.now();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'text-[11px] font-medium hover:bg-muted/80 rounded px-1.5 py-0.5 transition-colors cursor-pointer inline-flex items-center gap-1',
            isOverdue ? 'text-destructive' : 'text-muted-foreground',
            className
          )}
          title="Click to change due date"
        >
          <CalendarIcon className="w-3 h-3" />
          {formatDue(date)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={(d) => {
            if (d) {
              onChange(d);
              setOpen(false);
              toast.success('Due date updated');
            }
          }}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}

// ═══════════════════════════════════════════════════════════════
// StatusCycler — Click status badge to cycle / change with modal for Blocked
// ═══════════════════════════════════════════════════════════════

const statusStyles: Record<TaskStatus, string> = {
  'Pending': 'bg-muted text-muted-foreground',
  'In Progress': 'bg-blue-500/10 text-blue-600',
  'Blocked': 'bg-destructive/10 text-destructive',
  'Complete': 'bg-success/10 text-success',
};

const statusDotColors: Record<TaskStatus, string> = {
  'Pending': 'bg-muted-foreground',
  'In Progress': 'bg-blue-500',
  'Blocked': 'bg-destructive',
  'Complete': 'bg-success',
};

interface StatusCyclerProps {
  status: TaskStatus;
  onChange: (s: TaskStatus, reason?: string) => void;
  className?: string;
}

export function StatusCycler({ status, onChange, className }: StatusCyclerProps) {
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (blockerModalOpen && reasonRef.current) reasonRef.current.focus();
  }, [blockerModalOpen]);

  const selectStatus = (s: TaskStatus) => {
    if (s === 'Blocked') {
      setBlockerModalOpen(true);
      return;
    }
    onChange(s);
    toast.success(`Status → ${s}`);
  };

  const confirmBlock = () => {
    if (blockReason.trim().length < 10) return;
    onChange('Blocked', blockReason.trim());
    setBlockerModalOpen(false);
    setBlockReason('');
    toast.success('Status → Blocked');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-medium cursor-pointer hover:ring-1 hover:ring-foreground/20 transition-all',
              statusStyles[status],
              className
            )}
          >
            {status}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]" onClick={(e) => e.stopPropagation()}>
          {(['Pending', 'In Progress', 'Blocked', 'Complete'] as TaskStatus[]).map(s => (
            <DropdownMenuItem
              key={s}
              onClick={(e) => { e.stopPropagation(); selectStatus(s); }}
              className={cn('text-[12px] gap-2 cursor-pointer', s === status && 'bg-accent/10')}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', statusDotColors[s])} />
              {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Blocker Reason Modal */}
      {blockerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { e.stopPropagation(); setBlockerModalOpen(false); }}>
          <div className="bg-card border border-border rounded-xl p-6 w-[420px] max-w-[90vw] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold text-foreground mb-4">⚠ Block Task</h3>
            <label className="text-[12px] font-medium text-muted-foreground block mb-1">
              Blocking Reason <span className="text-destructive">*</span> (min 10 characters)
            </label>
            <textarea
              ref={reasonRef}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Why is this task blocked?"
              className="w-full border border-input rounded-md px-3 py-2 text-[13px] min-h-[80px] bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring mb-4"
              maxLength={500}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBlockerModalOpen(false)}>Cancel</Button>
              <Button
                onClick={confirmBlock}
                disabled={blockReason.trim().length < 10}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Block Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// InlineTitleEditor — Click title text to edit inline
// ═══════════════════════════════════════════════════════════════

interface InlineTitleEditorProps {
  title: string;
  onChange: (t: string) => void;
  className?: string;
  isComplete?: boolean;
  maxLength?: number;
}

export function InlineTitleEditor({ title, onChange, className, isComplete, maxLength = 200 }: InlineTitleEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => { setValue(title); }, [title]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (value.trim() && value !== title) { onChange(value.trim()); toast.success('Task title updated'); }
            setEditing(false);
          }
          if (e.key === 'Escape') { setValue(title); setEditing(false); }
        }}
        onBlur={() => {
          if (value.trim() && value !== title) { onChange(value.trim()); toast.success('Task title updated'); }
          setEditing(false);
        }}
        className={cn('bg-transparent border-b border-accent outline-none text-[13px] font-medium text-card-foreground w-full', className)}
      />
    );
  }

  return (
    <p
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={cn(
        'text-[13px] font-medium text-card-foreground truncate cursor-text hover:bg-muted/50 rounded px-0.5 transition-colors',
        isComplete && 'line-through opacity-50',
        className
      )}
      title="Click to edit title"
    >
      {title}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════
// CommentThread — Expandable per-task comments
// ═══════════════════════════════════════════════════════════════

interface TaskComment {
  id: string;
  author: string;
  text: string;
  timestamp: Date;
}

interface CommentThreadProps {
  taskId: string;
  commentCount: number;
  className?: string;
}

export function CommentThread({ taskId, commentCount, className }: CommentThreadProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Live comments from the task's comments thread (production: onSnapshot on
  // article-tasks/{taskId}/comments, written by the manageTasks callable)
  useEffect(() => {
    if (!expanded) return;
    const deliver = () => {
      setComments(getTaskCommentsSnapshot(taskId).map((c) => ({
        id: c.id,
        author: c.author,
        text: c.text,
        timestamp: c.createdAt,
      })));
      setLoaded(true);
    };
    const t = setTimeout(deliver, 50);
    const unsub = subscribeToStore(deliver);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [expanded, taskId]);
  void loaded;

  const addComment = async () => {
    if (!newComment.trim() || newComment.length > 1000) return;
    const text = newComment.trim();
    setNewComment('');
    try {
      // production: httpsCallable(functions, 'manageTasks') action 'comment'
      await callManageTasks({ action: 'comment', taskId, commentText: text } as unknown as import('../types').ManageTasksInput);
      toast.success('Comment added');
    } catch (err) {
      setNewComment(text);
      toast.error('Failed to add comment', { description: (err as Error).message });
    }
  };

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        title="Click to view comments"
      >
        <MessageCircle className="w-3 h-3" />
        <span>{commentCount}</span>
      </button>
      {expanded && (
        <div className="mt-2 ml-0 space-y-2 bg-muted/30 rounded-lg p-3 border border-border">
          {comments.map(c => (
            <div key={c.id} className="text-[11px]">
              <span className="font-semibold text-card-foreground">{c.author}</span>
              <span className="text-muted-foreground ml-1.5">{c.text}</span>
              <span className="text-[9px] text-muted-foreground/60 ml-2">
                {c.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 mt-1">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
              placeholder="Add a comment..."
              className="h-7 text-[11px] flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={addComment}>
              <Send className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
