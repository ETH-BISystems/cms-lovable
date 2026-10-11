import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ArticleStatus, Priority } from '../../types';

interface BulkActionBarProps {
  selectedCount: number;
  onChangeStatus: (status: ArticleStatus) => void;
  onChangePriority: (priority: Priority) => void;
  onReassign?: (assignee: string) => void;
  assignees?: readonly string[];
  onDelete: () => void;
  onClose: () => void;
}

const STATUSES: ArticleStatus[] = ['Discovered', 'Researching', 'Writing', 'In Review', 'Approved', 'Published'];
// Note: BulkActionBar still uses legacy statuses for the dropdown.
// The stage change happens via updateArticleStage on the backend.
const PRIORITIES: Priority[] = ['High', 'Medium', 'Low'];
const DEFAULT_ASSIGNEES = ['Sarah Chen', 'Mike Torres', 'Alex Kim', 'Jordan Lee'] as const;

export function BulkActionBar({ selectedCount, onChangeStatus, onChangePriority, onReassign, assignees, onDelete, onClose }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  const assigneeOptions = (assignees && assignees.length > 0 ? assignees : DEFAULT_ASSIGNEES).filter(a => a !== 'All');

  return (
    <div className="sticky bottom-4 bg-card border border-border rounded-lg p-3 flex items-center gap-3 shadow-lg z-10">
      <span className="text-sm font-semibold text-foreground">{selectedCount} selected</span>
      <Select onValueChange={v => onChangeStatus(v as ArticleStatus)}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue placeholder="Change Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select onValueChange={v => onChangePriority(v as Priority)}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="Change Priority" />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      {onReassign && (
        <Select onValueChange={v => onReassign(v)}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Reassign" />
          </SelectTrigger>
          <SelectContent>
            {assigneeOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={onDelete}>Delete</Button>
      <button onClick={onClose} className="ml-auto"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
    </div>
  );
}
