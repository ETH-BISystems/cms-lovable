import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import type { PipelineFilters } from '../../types';

const ENTRY_POINTS = ['All', 'RSS', 'Manual', 'Keyword', 'URL Drop'] as const;
const PRIORITIES = ['All', 'High', 'Medium', 'Low'] as const;
const EEAT_OPTIONS = ['All', 'Experience Sourced', 'No Experience'] as const;
const BLOCKED_OPTIONS = ['All', 'Has Blockers', 'No Blockers'] as const;

interface FilterBarProps {
  filters: PipelineFilters;
  onFilterChange: <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => void;
  onClear: () => void;
}

export function FilterBar({ filters, onFilterChange, onClear }: FilterBarProps) {
  const { members } = useTeamMembers();
  const assigneeOptions = ['All', ...members.map(m => m.name)];

  const hasActiveFilters = filters.entryPoint !== 'All' || filters.priority !== 'All' || filters.assignee !== 'All' || filters.eeat !== 'All' || filters.blocked !== 'All';

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground block mb-1">Entry Point</label>
        <Select value={filters.entryPoint} onValueChange={v => onFilterChange('entryPoint', v as PipelineFilters['entryPoint'])}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTRY_POINTS.map(ep => <SelectItem key={ep} value={ep}>{ep}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground block mb-1">Priority</label>
        <Select value={filters.priority} onValueChange={v => onFilterChange('priority', v as PipelineFilters['priority'])}>
          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground block mb-1">Assignee</label>
        <Select value={filters.assignee} onValueChange={v => onFilterChange('assignee', v)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {assigneeOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground block mb-1">E-E-A-T</label>
        <Select value={filters.eeat} onValueChange={v => onFilterChange('eeat', v as PipelineFilters['eeat'])}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {EEAT_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground block mb-1">Blocked</label>
        <Select value={filters.blocked} onValueChange={v => onFilterChange('blocked', v as PipelineFilters['blocked'])}>
          <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BLOCKED_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && (
        <button onClick={onClear} className="text-xs text-accent hover:underline pb-1">Clear filters</button>
      )}
    </div>
  );
}
