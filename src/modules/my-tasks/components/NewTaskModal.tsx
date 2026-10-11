import { useState, useEffect } from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { TaskSource, TaskPriority } from '../types';
import { ALL_SOURCES, SOURCE_TYPES } from '../types';
import { useCustomTaskTypes } from '../hooks/useCustomTaskTypes';
import type { TaskStatus } from '@/modules/pipeline';
// production: httpsCallable(functions, 'manageTasks' / 'manageTaskTypes');
//             onSnapshot(query(collection(db, 'users')))
import { manageTasks, manageTaskTypes, subscribeToTeamMembers } from '../services/myTasksService';

interface NewTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Sentinel value for the "Custom…" entry in the Type dropdown. */
const CUSTOM_TYPE_VALUE = '__custom__';

export function NewTaskModal({ open, onOpenChange }: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<TaskSource>('Blog Engine');
  const [taskType, setTaskType] = useState('');
  const [customTypeName, setCustomTypeName] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const { customTypes } = useCustomTaskTypes();

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

  const filteredTeam = teamMembers.filter(m =>
    m.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const resetForm = () => {
    setTitle('');
    setSource('Blog Engine');
    setTaskType('');
    setCustomTypeName('');
    setPriority('Medium');
    setStatus('Pending');
    setAssignee('');
    setDueDate(undefined);
    setDescription('');
    setAssigneeSearch('');
  };

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

  const isCustomType = taskType === CUSTOM_TYPE_VALUE;
  const effectiveTaskType = isCustomType ? customTypeName.trim() : taskType;

  const handleCreate = async () => {
    if (!title.trim() || !dueDate || !effectiveTaskType) return;

    setSubmitting(true);
    try {
      // Persist a newly entered custom type first so it appears in the
      // dropdown for future tasks (idempotent server-side).
      if (isCustomType) {
        await manageTaskTypes({ action: 'create', source, name: effectiveTaskType });
      }

      await manageTasks({
        action: 'create',
        articleId: 'standalone', // standalone task not tied to a specific article
        name: title.trim(),
        assignee: assignee || 'Unassigned',
        dueDate: dueDate.toISOString(),
        status,
        priority,
        source,
        taskType: effectiveTaskType || undefined,
        description: description || undefined,
      });
      toast.success('Task created', { description: `"${title.trim()}" added to your tasks.` });
      onOpenChange(false);
      resetForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      toast.error('Error creating task', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-3">
          <DialogTitle className="font-display text-[18px] font-semibold tracking-tight">New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Task Title <span className="text-destructive">*</span></label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="text-[13px]" />
          </div>

          {/* Source + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Source <span className="text-destructive">*</span></label>
              <Select value={source} onValueChange={v => { setSource(v as TaskSource); setTaskType(''); setCustomTypeName(''); }}>
                <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>{ALL_SOURCES.map(s => <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Type <span className="text-destructive">*</span></label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="text-[12px]"><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {[...(SOURCE_TYPES[source] || []), ...(customTypes[source] || [])].map(t => (
                    <SelectItem key={t} value={t} className="text-[12px]">{t}</SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value={CUSTOM_TYPE_VALUE} className="text-[12px]">
                    <span className="text-accent font-medium">+ Custom…</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {isCustomType && (
                <Input
                  value={customTypeName}
                  onChange={e => setCustomTypeName(e.target.value)}
                  placeholder="New type name"
                  maxLength={60}
                  autoFocus
                  className="text-[12px] mt-2"
                />
              )}
            </div>
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Priority</label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['High', 'Medium', 'Low'] as TaskPriority[]).map(p => (
                    <SelectItem key={p} value={p} className="text-[12px]">
                      <span className="flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full', p === 'High' ? 'bg-destructive' : p === 'Medium' ? 'bg-warning' : 'bg-success')} />
                        {p}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Status</label>
              <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['Pending', 'In Progress', 'Blocked', 'Complete'] as TaskStatus[]).map(s => (
                    <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee */}
          <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Assignee</label>
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full h-9 px-3 text-[12px] border border-input rounded-md text-left flex items-center gap-2 hover:bg-muted/50 transition-colors">
                    {assignee ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white', getAvatarColor(assignee))}>{assignee[0]?.toUpperCase()}</span>
                        <span className="text-card-foreground">{assignee}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select assignee...</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-2" align="start">
                  <Input value={assigneeSearch} onChange={e => setAssigneeSearch(e.target.value)} placeholder="Search team..." className="h-7 text-[11px] mb-2" />
                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                    {filteredTeam.map(m => (
                      <button key={m.id} onClick={() => { setAssignee(m.name); setAssigneeOpen(false); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-left">
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

          {/* Due Date */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Due Date <span className="text-destructive">*</span></label>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full h-9 px-3 text-[12px] border border-input rounded-md text-left flex items-center gap-2 hover:bg-muted/50 transition-colors">
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  {dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-muted-foreground">Select due date</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Description (optional)</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add details about this task..." className="text-[12px] min-h-[80px]" />
          </div>
        </div>
        <DialogFooter className="border-t border-border/60 pt-4">
          <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || !effectiveTaskType || !dueDate || submitting}>
            {submitting ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
