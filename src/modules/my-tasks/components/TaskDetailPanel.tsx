import { useState, useRef, useEffect } from 'react';
import { X, Link2, CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth';
import type { MyTask, TaskSource, TaskPriority } from '../types';
import { SOURCE_TYPES } from '../types';
import { useCustomTaskTypes } from '../hooks/useCustomTaskTypes';
import type { TaskStatus } from '@/modules/pipeline';
import { MentionInput, CommentText } from './MentionInput';
// production: httpsCallable(functions, 'manageTasks');
//             onSnapshot(collection(db, 'article-tasks', id, 'comments'));
//             onSnapshot(doc(db, 'article-tasks', id));
//             onSnapshot(query(collection(db, 'users')))
import {
  manageTasks,
  subscribeToTaskComments,
  subscribeToTaskDoc,
  subscribeToTeamMembers,
} from '../services/myTasksService';

interface TaskDetailPanelProps {
  task: MyTask;
  onClose: () => void;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  authorUid: string;
  createdAt: Date;
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-gradient-to-br from-blue-400 to-blue-600',
    'bg-gradient-to-br from-purple-400 to-purple-600',
    'bg-gradient-to-br from-emerald-400 to-emerald-600',
    'bg-gradient-to-br from-orange-400 to-orange-600',
    'bg-gradient-to-br from-pink-400 to-pink-600',
    'bg-gradient-to-br from-cyan-400 to-cyan-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const sourceBadgeInline: Record<TaskSource, string> = {
  'Blog Engine': 'bg-blue-500/10 text-blue-700',
  'Newsletter': 'bg-purple-500/10 text-purple-700',
  'Card Data': 'bg-emerald-500/10 text-emerald-700',
  'Client Dashboard': 'bg-orange-500/10 text-orange-700',
  'Content Creation': 'bg-pink-500/10 text-pink-700',
};

const statusStyles: Record<TaskStatus, string> = {
  'Pending': 'bg-muted text-muted-foreground',
  'In Progress': 'bg-info/10 text-info',
  'Blocked': 'bg-destructive/10 text-destructive',
  'Complete': 'bg-success/10 text-success',
};

function priorityDot(p: TaskPriority) {
  if (p === 'High') return 'bg-destructive';
  if (p === 'Medium') return 'bg-warning';
  return 'bg-success';
}

function formatDate(d: Date | null | undefined) {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function dueDateColor(d: Date | null | undefined) {
  if (!d) return 'text-muted-foreground';
  const DAY = 86400000;
  const diff = Math.ceil((d.getTime() - Date.now()) / DAY);
  if (diff < 0) return 'text-destructive';
  if (diff === 0) return 'text-yellow-600';
  return 'text-muted-foreground';
}

function relativeTime(d: Date) {
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const { user } = useAuth();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.name);
  const titleRef = useRef<HTMLInputElement>(null);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descVal, setDescVal] = useState(task.description || '');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState('');
  const [notes, setNotes] = useState('');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState<Date | undefined>(task.dueDate || undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [assignee, setAssignee] = useState(task.assignee);
  const [taskType, setTaskType] = useState(task.taskType || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const { customTypes } = useCustomTaskTypes();

  // Built-in + custom types for this task's source; always include the task's
  // current type so the dropdown can display legacy/one-off values.
  const typeOptions = (() => {
    const options = [
      ...(SOURCE_TYPES[task.source] || SOURCE_TYPES['Blog Engine']),
      ...(customTypes[task.source] || []),
    ];
    if (taskType && !options.includes(taskType)) options.push(taskType);
    return options;
  })();

  // Sync state when task prop changes
  useEffect(() => {
    setTitleVal(task.name);
    setDescVal(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setDueDate(task.dueDate || undefined);
    setAssignee(task.assignee);
    setTaskType(task.taskType || '');
  }, [task.id, task.name, task.description, task.status, task.priority, task.dueDate, task.assignee, task.taskType]);

  useEffect(() => {
    if (editingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editingTitle]);

  // Subscribe to comments subcollection
  useEffect(() => {
    const unsub = subscribeToTaskComments(task.id, (rows) => {
      const items: Comment[] = rows.map(r => ({
        id: r.id,
        text: r.text || '',
        author: r.author || 'Unknown',
        authorUid: r.authorUid || '',
        createdAt: r.createdAt?.toDate?.() || new Date(),
      }));
      setComments(items);
    });
    return () => unsub();
  }, [task.id]);

  // Subscribe to task document for notes/startDate
  useEffect(() => {
    const unsub = subscribeToTaskDoc(task.id, (data) => {
      if (data) {
        const n = (typeof data.notes === 'string' ? data.notes : '') as string;
        setNotes(n);
        setNotesVal(n);
        const sd = data.startDate as { toDate?: () => Date } | undefined;
        if (sd?.toDate) setStartDate(sd.toDate());
      }
    });
    return () => unsub();
  }, [task.id]);

  // Load team members from Firestore users collection
  useEffect(() => {
    const unsub = subscribeToTeamMembers((docs) => {
      const members = docs.map(d => ({
        id: d.id,
        name: d.displayName || d.name || d.email || 'Unknown',
        role: d.role || 'Writer',
      }));
      setTeamMembers(members);
    });
    return () => unsub();
  }, []);

  const callManageTasks = async (payload: Record<string, unknown>) => {
    return manageTasks(payload);
  };

  const saveTitle = async () => {
    if (titleVal.trim() && titleVal !== task.name) {
      try {
        await callManageTasks({ action: 'update', taskId: task.id, name: titleVal.trim() });
        toast.success('Title updated');
      } catch { toast.error('Failed to update title'); }
    }
    setEditingTitle(false);
  };

  const updateStatus = async (newStatus: TaskStatus) => {
    const prevStatus = status;
    setStatus(newStatus);
    try {
      if (newStatus === 'Complete') {
        await callManageTasks({ action: 'complete', taskId: task.id });
      } else if (newStatus === 'Blocked') {
        await callManageTasks({ action: 'block', taskId: task.id, blockReason: 'Blocked via task detail panel' });
      } else if (prevStatus === 'Blocked') {
        await callManageTasks({ action: 'unblock', taskId: task.id });
      } else {
        await callManageTasks({ action: 'update', taskId: task.id, status: newStatus });
      }
      toast.success(`Status → ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
      setStatus(prevStatus);
    }
  };

  const updatePriority = async (newPriority: TaskPriority) => {
    const prev = priority;
    setPriority(newPriority);
    try {
      await callManageTasks({ action: 'update', taskId: task.id, priority: newPriority });
      toast.success(`Priority → ${newPriority}`);
    } catch {
      toast.error('Failed to update priority');
      setPriority(prev);
    }
  };

  const updateDueDate = async (date: Date | undefined) => {
    setDueDate(date);
    try {
      await callManageTasks({ action: 'update', taskId: task.id, dueDate: date?.toISOString() || '' });
      toast.success('Due date updated');
    } catch { toast.error('Failed to update due date'); }
  };

  const updateStartDate = async (date: Date | undefined) => {
    setStartDate(date);
    try {
      await callManageTasks({ action: 'update', taskId: task.id, startDate: date?.toISOString() || '' });
      toast.success('Start date updated');
    } catch { toast.error('Failed to update start date'); }
  };

  const updateAssignee = async (name: string) => {
    setAssignee(name);
    setAssigneeOpen(false);
    try {
      await callManageTasks({ action: 'update', taskId: task.id, assignee: name });
      toast.success(`Assigned to ${name}`);
    } catch { toast.error('Failed to update assignee'); }
  };

  const updateTaskType = async (type: string) => {
    setTaskType(type);
    try {
      await callManageTasks({ action: 'update', taskId: task.id, taskType: type });
      toast.success(`Type → ${type}`);
    } catch { toast.error('Failed to update type'); }
  };

  const saveDescription = async () => {
    try {
      await callManageTasks({ action: 'update', taskId: task.id, description: descVal });
      toast.success('Description updated');
    } catch { toast.error('Failed to update description'); }
    setEditingDesc(false);
  };

  const saveNotes = async () => {
    try {
      await callManageTasks({ action: 'update', taskId: task.id, notes: notesVal });
      toast.success('Notes saved');
    } catch { toast.error('Failed to save notes'); }
    setEditingNotes(false);
  };

  const postComment = async () => {
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const authorName = user?.displayName || user?.email || 'Unknown';
      await callManageTasks({
        action: 'comment',
        taskId: task.id,
        commentText: newComment.trim(),
        commentAuthor: authorName,
      });
      setNewComment('');
      toast.success('Comment posted');
    } catch { toast.error('Failed to post comment'); }
    setSubmittingComment(false);
  };

  const resolveBlocker = async () => {
    try {
      await callManageTasks({ action: 'unblock', taskId: task.id });
      setStatus('In Progress');
      toast.success('Blocker resolved');
    } catch { toast.error('Failed to resolve blocker'); }
  };

  const handleDelete = async () => {
    try {
      await callManageTasks({ action: 'complete', taskId: task.id });
      toast.success('Task completed/removed');
      onClose();
    } catch { toast.error('Failed to delete task'); }
  };

  const filteredTeam = teamMembers.filter(m =>
    m.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-[420px] max-w-[95vw] bg-card border-l border-border/70 shadow-overlay flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-border/60">
          <div className="flex items-start justify-between gap-2 mb-3">
            {editingTitle ? (
              <input
                ref={titleRef}
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleVal(task.name); setEditingTitle(false); } }}
                onBlur={saveTitle}
                className="font-display text-[17px] font-semibold tracking-tight text-foreground bg-transparent border-b-2 border-accent outline-none flex-1"
              />
            ) : (
              <h2 onClick={() => setEditingTitle(true)} className="font-display text-[17px] font-semibold tracking-tight text-foreground cursor-text hover:bg-muted/50 rounded-md px-1 transition-colors duration-150 flex-1">{titleVal}</h2>
            )}
            <button onClick={onClose} className="shrink-0 p-1 hover:bg-muted rounded-md transition-colors duration-150"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          {/* Status + Priority as interactive dropdowns */}
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={v => updateStatus(v as TaskStatus)}>
              <SelectTrigger className="h-7 w-auto text-[11px] font-medium border-0 p-0 px-2 shadow-none">
                <span className={cn('px-2 py-0.5 rounded-full font-medium', statusStyles[status])}>{status}</span>
              </SelectTrigger>
              <SelectContent>
                {(['Pending', 'In Progress', 'Blocked', 'Complete'] as TaskStatus[]).map(s => (
                  <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={v => updatePriority(v as TaskPriority)}>
              <SelectTrigger className="h-7 w-auto text-[11px] font-medium border-0 p-0 px-2 shadow-none">
                <span className="flex items-center gap-1.5">
                  <span className={cn('w-2.5 h-2.5 rounded-full', priorityDot(priority))} />
                  {priority}
                </span>
              </SelectTrigger>
              <SelectContent>
                {(['High', 'Medium', 'Low'] as TaskPriority[]).map(p => (
                  <SelectItem key={p} value={p} className="text-[12px]">
                    <span className="flex items-center gap-1.5"><span className={cn('w-2.5 h-2.5 rounded-full', priorityDot(p))} />{p}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 divide-y divide-border/60">
          {/* Details */}
          <div className="space-y-3 py-5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <span className="text-muted-foreground block mb-1">Source</span>
                <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', sourceBadgeInline[task.source])}>{task.source}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Type</span>
                <Select value={taskType} onValueChange={updateTaskType}>
                  <SelectTrigger className="h-7 text-[11px] w-full">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(t => (
                      <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Start Date — clickable calendar */}
              <div>
                <span className="text-muted-foreground block mb-1">Start Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                      <CalendarIcon className="w-3 h-3" /> {formatDate(startDate)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={updateStartDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              {/* Due Date — clickable calendar */}
              <div>
                <span className="text-muted-foreground block mb-1">Due Date</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn('text-[11px] flex items-center gap-1 hover:text-foreground transition-colors', dueDateColor(dueDate))}>
                      <CalendarIcon className="w-3 h-3" /> {formatDate(dueDate)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={updateDueDate} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Assignees — clickable to change */}
            <div>
              <span className="text-muted-foreground text-[12px] block mb-1">Assignees</span>
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-[10px] px-2 py-0.5 rounded-full font-medium">
                      <span className={cn('w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white', getAvatarColor(assignee))}>{assignee[0]?.toUpperCase()}</span>
                      {assignee}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-2" align="start">
                  <Input value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} placeholder="Search team..." className="h-7 text-[11px] mb-2" />
                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                    {filteredTeam.map(m => (
                      <button key={m.id} onClick={() => updateAssignee(m.name)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-left">
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0', getAvatarColor(m.name))}>{m.name[0]}</div>
                        <span className="text-[12px] font-medium text-card-foreground flex-1">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground">{m.role}</span>
                        {assignee === m.name && <span className="text-accent text-[12px]">✓</span>}
                      </button>
                    ))}
                    {filteredTeam.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-2">No team members found</p>}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Related Item */}
            {task.articleTitle && task.articleTitle !== 'Unknown Article' && (
              <div>
                <span className="text-muted-foreground text-[12px] block mb-1">Related Item</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium">
                  <Link2 className="w-3 h-3" /> {task.articleTitle}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="py-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</h3>
              {descVal && !editingDesc && <button onClick={() => setEditingDesc(true)} className="text-[10px] text-accent hover:underline">Edit</button>}
            </div>
            {editingDesc ? (
              <div>
                <textarea value={descVal} onChange={e => setDescVal(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-[12px] min-h-[80px] bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
                <div className="flex gap-2 mt-1">
                  <button onClick={saveDescription} className="text-[11px] px-3 py-1 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors duration-150">Save</button>
                  <button onClick={() => { setDescVal(task.description || ''); setEditingDesc(false); }} className="text-[11px] px-3 py-1 border border-border/70 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors duration-150">Cancel</button>
                </div>
              </div>
            ) : descVal ? (
              <p onClick={() => setEditingDesc(true)} className="text-[12px] text-card-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors">{descVal}</p>
            ) : (
              <p onClick={() => setEditingDesc(true)} className="text-[12px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">Add a description...</p>
            )}
          </div>

          {/* Subtasks */}
          <div className="py-5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subtasks</h3>
            <button className="text-[11px] text-accent hover:underline">+ Add subtask</button>
          </div>

          {/* Blocking */}
          {status === 'Blocked' && (
            <div className="py-5">
              <div className="border-l-2 border-destructive pl-3 py-2 bg-destructive/5 rounded-r-md">
                <h3 className="text-[11px] font-semibold text-destructive uppercase tracking-wider mb-1">Blocking Reason</h3>
                <p className="text-[12px] text-card-foreground mb-2">{task.blockReason || 'No reason provided'}</p>
                <button onClick={resolveBlocker} className="text-[11px] px-3 py-1.5 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors duration-150">Resolve Blocker</button>
              </div>
            </div>
          )}

          {/* Comments & Activity — stored in Firestore subcollection */}
          <div className="py-5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Comments & Activity</h3>
            <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-[10px] italic text-muted-foreground">No comments yet</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5', getAvatarColor(c.author))}>{c.author[0]?.toUpperCase()}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-card-foreground">{c.author}</span>
                      <span className="text-[9px] text-muted-foreground">{relativeTime(c.createdAt)}</span>
                    </div>
                    <CommentText text={c.text} />
                  </div>
                </div>
              ))}
            </div>
            <MentionInput
              value={newComment}
              onChange={setNewComment}
              onSubmit={postComment}
              disabled={submittingComment}
              teamMembers={teamMembers}
            />
          </div>

          {/* Notes — persisted to Firestore */}
          <div className="py-5">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</h3>
            {editingNotes ? (
              <div>
                <textarea value={notesVal} onChange={e => setNotesVal(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-[12px] min-h-[60px] bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Internal notes, links, or context..." autoFocus />
                <div className="flex gap-2 mt-1">
                  <button onClick={saveNotes} className="text-[11px] px-3 py-1 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors duration-150">Save</button>
                  <button onClick={() => { setNotesVal(notes); setEditingNotes(false); }} className="text-[11px] px-3 py-1 border border-border/70 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors duration-150">Cancel</button>
                </div>
              </div>
            ) : notes ? (
              <p onClick={() => setEditingNotes(true)} className="text-[12px] text-card-foreground whitespace-pre-wrap cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors">{notes}</p>
            ) : (
              <p onClick={() => setEditingNotes(true)} className="text-[12px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">Add notes...</p>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/60 px-5 py-3 flex items-center justify-between">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-destructive">Delete this task?</span>
              <button onClick={handleDelete} className="text-[11px] px-2 py-1 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors duration-150">Delete</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-[11px] px-2 py-1 border border-border/70 rounded-md text-muted-foreground hover:bg-muted/50 transition-colors duration-150">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} className="text-[11px] text-destructive hover:underline">Delete Task</button>
          )}
          <span className="text-[10px] text-muted-foreground">Task ID: {task.id.slice(0, 8)}</span>
        </div>
      </div>
    </>
  );
}
