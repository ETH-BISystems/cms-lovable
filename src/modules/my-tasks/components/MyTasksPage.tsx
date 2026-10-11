import { useState, useMemo } from 'react';
import {
  CheckSquare, Plus, List, Columns, Clock, AlertTriangle, CalendarDays,
  MessageSquare, CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAllTasks } from '../hooks/useAllTasks';
import type { MyTask, TaskSource, TaskPriority } from '../types';
import { ALL_SOURCES } from '../types';
import type { TaskStatus } from '@/modules/pipeline';
import { NewTaskModal } from './NewTaskModal';
import { TaskDetailPanel } from './TaskDetailPanel';

const DAY = 86400000;

function getDateGroup(d: Date | null): string {
  if (!d) return 'NO DATE';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const taskDate = new Date(d); taskDate.setHours(0, 0, 0, 0);
  const diff = (taskDate.getTime() - today.getTime()) / DAY;
  if (diff < 0) return 'OVERDUE';
  if (diff === 0) return 'TODAY';
  if (diff <= 6) return 'THIS WEEK';
  return 'LATER';
}

const groupOrder = ['OVERDUE', 'TODAY', 'THIS WEEK', 'LATER', 'NO DATE', 'COMPLETED'];

function formatDue(d: Date | null) {
  if (!d) return '—';
  const diff = Math.ceil((d.getTime() - Date.now()) / DAY);
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function dueDateColor(d: Date | null) {
  if (!d) return 'text-muted-foreground';
  const diff = Math.ceil((d.getTime() - Date.now()) / DAY);
  if (diff < 0) return 'text-destructive';
  if (diff === 0) return 'text-yellow-600';
  return 'text-muted-foreground';
}

function priorityDot(p: TaskPriority) {
  if (p === 'High') return 'bg-destructive';
  if (p === 'Medium') return 'bg-warning';
  return 'bg-success';
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

const statusStyles: Record<TaskStatus, string> = {
  'Pending': 'bg-muted text-muted-foreground',
  'In Progress': 'bg-info/10 text-info',
  'Blocked': 'bg-destructive/10 text-destructive',
  'Complete': 'bg-success/10 text-success',
};

const statusTone: Record<TaskStatus, 'neutral' | 'info' | 'danger' | 'success'> = {
  'Pending': 'neutral',
  'In Progress': 'info',
  'Blocked': 'danger',
  'Complete': 'success',
};

const sourceBadgeStyles: Record<TaskSource, { active: string; inactive: string }> = {
  'Blog Engine': { active: 'bg-blue-500/10 text-blue-700 ring-1 ring-inset ring-blue-500/25', inactive: 'bg-muted/60 text-muted-foreground/70 ring-1 ring-inset ring-transparent hover:text-foreground' },
  'Newsletter': { active: 'bg-purple-500/10 text-purple-700 ring-1 ring-inset ring-purple-500/25', inactive: 'bg-muted/60 text-muted-foreground/70 ring-1 ring-inset ring-transparent hover:text-foreground' },
  'Card Data': { active: 'bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/25', inactive: 'bg-muted/60 text-muted-foreground/70 ring-1 ring-inset ring-transparent hover:text-foreground' },
  'Client Dashboard': { active: 'bg-orange-500/10 text-orange-700 ring-1 ring-inset ring-orange-500/25', inactive: 'bg-muted/60 text-muted-foreground/70 ring-1 ring-inset ring-transparent hover:text-foreground' },
  'Content Creation': { active: 'bg-pink-500/10 text-pink-700 ring-1 ring-inset ring-pink-500/25', inactive: 'bg-muted/60 text-muted-foreground/70 ring-1 ring-inset ring-transparent hover:text-foreground' },
};

const sourceBadgeInline: Record<TaskSource, string> = {
  'Blog Engine': 'bg-blue-500/10 text-blue-700',
  'Newsletter': 'bg-purple-500/10 text-purple-700',
  'Card Data': 'bg-emerald-500/10 text-emerald-700',
  'Client Dashboard': 'bg-orange-500/10 text-orange-700',
  'Content Creation': 'bg-pink-500/10 text-pink-700',
};

export function MyTasksPage() {
  const { tasks, loading } = useAllTasks();
  const [view, setView] = useState<'list' | 'board'>('list');
  const [activeSources, setActiveSources] = useState<Set<TaskSource>>(new Set(ALL_SOURCES));
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [detailTask, setDetailTask] = useState<MyTask | null>(null);

  // Initialize checked from completed tasks
  useMemo(() => {
    const completedIds = new Set(tasks.filter(t => t.status === 'Complete').map(t => t.id));
    setChecked(completedIds);
  }, [tasks]);

  const sourceCounts = useMemo(() => {
    const c: Record<TaskSource, number> = { 'Blog Engine': 0, 'Newsletter': 0, 'Card Data': 0, 'Client Dashboard': 0, 'Content Creation': 0 };
    tasks.forEach(t => { if (c[t.source] !== undefined) c[t.source]++; });
    return c;
  }, [tasks]);

  const toggleSource = (source: TaskSource) => {
    setActiveSources(prev => { const next = new Set(prev); next.has(source) ? next.delete(source) : next.add(source); return next; });
  };

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (!activeSources.has(t.source)) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'All' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, activeSources, statusFilter, priorityFilter]);

  const toggleCheck = (id: string) => {
    setChecked(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const grouped = useMemo(() => {
    const groups: Record<string, MyTask[]> = {};
    const completed: MyTask[] = [];
    const incomplete: MyTask[] = [];
    filtered.forEach(t => { if (checked.has(t.id)) completed.push(t); else incomplete.push(t); });
    incomplete.sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
    incomplete.forEach(t => { const g = getDateGroup(t.dueDate); if (!groups[g]) groups[g] = []; groups[g].push(t); });
    if (completed.length) groups['COMPLETED'] = completed;
    return groups;
  }, [filtered, checked]);

  const boardColumns: Record<TaskStatus, MyTask[]> = useMemo(() => {
    const cols: Record<TaskStatus, MyTask[]> = { 'Pending': [], 'In Progress': [], 'Blocked': [], 'Complete': [] };
    filtered.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });
    return cols;
  }, [filtered]);

  const groupHeaderStyle = (g: string) => g === 'OVERDUE' ? 'bg-destructive/5 text-destructive' : 'text-muted-foreground';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-foreground">My Tasks</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold tracking-tight text-foreground">My Tasks</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Everything assigned to you across the suite, grouped by due date.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      {/* Source pills */}
      <div className="bg-card border border-border/70 shadow-card rounded-xl px-4 py-2.5 text-[12px] text-muted-foreground flex items-center gap-2 flex-wrap">
        <span>Showing tasks across</span>
        {ALL_SOURCES.map(s => (
          <button key={s} onClick={() => toggleSource(s)} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-colors duration-150 text-[11px]', activeSources.has(s) ? sourceBadgeStyles[s].active : sourceBadgeStyles[s].inactive)}>
            {s}
            <span className={cn('rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums', activeSources.has(s) ? 'bg-card/70' : 'bg-foreground/[0.05]')}>{sourceCounts[s]}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Source</label>
          <Select value={activeSources.size === ALL_SOURCES.length ? 'All' : activeSources.size === 1 ? [...activeSources][0] : 'Mixed'} onValueChange={v => {
            if (v === 'All') setActiveSources(new Set(ALL_SOURCES));
            else setActiveSources(new Set([v as TaskSource]));
          }}>
            <SelectTrigger className="w-[150px] h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>{['All', ...ALL_SOURCES].map(s => <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>{['All', 'Pending', 'In Progress', 'Blocked', 'Complete'].map(s => <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[120px] h-8 text-[12px]"><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>{['All', 'High', 'Medium', 'Low'].map(s => <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-0.5 bg-muted rounded-lg p-0.5 self-end">
          <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150', view === 'list' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground')}>
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button onClick={() => setView('board')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-150', view === 'board' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground')}>
            <Columns className="h-3.5 w-3.5" /> Board
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-3">
            <CheckSquare className="h-5 w-5" />
          </div>
          <p className="text-[14px] font-semibold text-foreground">No tasks to show</p>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-sm mx-auto">
            {tasks.length === 0 ? 'No tasks yet. Tasks are created automatically when articles move to Writing or In Review stages.' : 'No tasks from selected sources'}
          </p>
        </div>
      )}

      {/* List View */}
      {view === 'list' && filtered.length > 0 && (
        <div className="space-y-4">
          {groupOrder.filter(g => grouped[g]?.length).map(g => (
            <div key={g}>
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-t-lg text-[11px] font-semibold uppercase tracking-wider', groupHeaderStyle(g))}>
                {g === 'OVERDUE' && <AlertTriangle className="h-3 w-3" />}
                {g === 'TODAY' && <Clock className="h-3 w-3" />}
                {g === 'THIS WEEK' && <CalendarDays className="h-3 w-3" />}
                {g === 'COMPLETED' && <CheckSquare className="h-3 w-3" />}
                {g}
                {g === 'OVERDUE'
                  ? <Badge variant="danger" className="px-1.5 py-0 text-[10px] tabular-nums">{grouped[g].length}</Badge>
                  : <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground tabular-nums">{grouped[g].length}</span>}
              </div>
              <div className={cn('bg-card rounded-b-xl border border-border/70 shadow-card divide-y divide-border/60', g === 'OVERDUE' && 'border-l-2 border-l-destructive bg-destructive/5', g === 'COMPLETED' && 'opacity-60')}>
                {grouped[g].map(t => (
                  <TaskRow key={t.id} task={t} isChecked={checked.has(t.id)} onToggle={() => toggleCheck(t.id)} onSelect={() => setDetailTask(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Board View */}
      {view === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Pending', 'In Progress', 'Blocked', 'Complete'] as TaskStatus[]).map(col => (
            <div key={col}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md', statusStyles[col])}>{col === 'Pending' ? 'To Do' : col}</span>
                <span className="rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground font-medium tabular-nums">{boardColumns[col].length}</span>
              </div>
              <div className="bg-muted/40 rounded-xl p-2 min-h-[200px]">
                {boardColumns[col].map(t => (
                  <BoardCard key={t.id} task={t} onSelect={() => setDetailTask(t)} />
                ))}
                {boardColumns[col].length === 0 && <p className="text-[11px] text-muted-foreground text-center py-8">No tasks</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Task Modal */}
      <NewTaskModal open={modalOpen} onOpenChange={setModalOpen} />

      {/* Task Detail Panel */}
      {detailTask && (
        <TaskDetailPanel task={detailTask} onClose={() => setDetailTask(null)} />
      )}
    </div>
  );
}

// --- Sub-components ---

function TaskRow({ task: t, isChecked, onToggle, onSelect }: { task: MyTask; isChecked: boolean; onToggle: () => void; onSelect: () => void }) {
  return (
    <div onClick={onSelect} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors duration-150 group cursor-pointer">
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="shrink-0">
        {isChecked
          ? <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center"><CheckSquare className="h-3 w-3 text-accent-foreground" /></div>
          : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 transition-colors duration-150 group-hover:border-muted-foreground/50" />}
      </button>
      {/* Priority dot */}
      <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', priorityDot(t.priority))} title={t.priority} />
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className={cn('text-[13px] font-medium text-card-foreground truncate', isChecked && 'line-through opacity-60')}>{t.name}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', sourceBadgeInline[t.source])}>{t.source}</span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{t.articleTitle}</span>
          <StatusBadge status={t.status} variant={statusTone[t.status]} className="px-2 py-0 text-[10px]" />
        </div>
      </div>
      {/* Comment count */}
      {t.comments > 0 && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MessageSquare className="w-3 h-3" /><span className="tabular-nums">{t.comments}</span>
        </div>
      )}
      {/* Due date */}
      <span className={cn('text-[11px] font-medium flex items-center gap-1 shrink-0', dueDateColor(t.dueDate))}>
        <CalendarIcon className="w-3 h-3" />{formatDue(t.dueDate)}
      </span>
      {/* Assignee avatar */}
      <div className={cn('w-6 h-6 rounded-full ring-2 ring-card flex items-center justify-center text-[10px] font-semibold text-white shrink-0', getAvatarColor(t.assignee))} title={t.assignee}>
        {t.assignee[0]?.toUpperCase() || '?'}
      </div>
    </div>
  );
}

function BoardCard({ task: t, onSelect }: { task: MyTask; onSelect: () => void }) {
  return (
    <div onClick={onSelect} className="bg-card border border-border/70 rounded-xl p-3 mb-2 shadow-card card-interactive cursor-pointer">
      <p className="text-[12px] font-semibold text-card-foreground mb-1.5 truncate">{t.name}</p>
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', sourceBadgeInline[t.source])}>{t.source}</span>
        <div className={cn('w-2 h-2 rounded-full', priorityDot(t.priority))} title={t.priority} />
        <StatusBadge status={t.status} variant={statusTone[t.status]} className="px-1.5 py-0 text-[9px]" />
      </div>
      <p className="text-[11px] text-muted-foreground truncate mb-1.5">{t.articleTitle}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn('text-[11px] font-medium flex items-center gap-1', dueDateColor(t.dueDate))}>
            <CalendarIcon className="w-3 h-3" />{formatDue(t.dueDate)}
          </span>
          {t.comments > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquare className="w-3 h-3" />{t.comments}
            </span>
          )}
        </div>
        <div className={cn('w-6 h-6 rounded-full ring-2 ring-card flex items-center justify-center text-[10px] font-semibold text-white shrink-0', getAvatarColor(t.assignee))} title={t.assignee}>
          {t.assignee[0]?.toUpperCase() || '?'}
        </div>
      </div>
    </div>
  );
}
