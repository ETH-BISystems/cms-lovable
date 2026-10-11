import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { SourceBadge, PriorityPill, TaskProgressBar, QualityScoreRing, TimeAgo } from './KanbanCard';
import { Badge } from '@/components/ui/badge';
import type { PipelineArticle } from '../../types';

interface ListViewProps {
  articles: PipelineArticle[];
  selected: Set<string>;
  toggleSelect: (id: string) => void;
  toggleAll: () => void;
  onRowClick: (article: PipelineArticle) => void;
  onBlockedClick: (article: PipelineArticle) => void;
}

const STATUS_ORDER = ['New Article', 'Keyword Discovery', 'Select Keywords', 'Deep Research', 'Write Article', 'Humanise', 'Review & Edit', 'Add Photos + SEO Check', 'Watermark Removal', 'Fact Check', 'Final Approval', 'Publish'];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'New Article': 'bg-green-500/15 text-green-700',
    'Keyword Discovery': 'bg-blue-500/15 text-blue-700',
    'Select Keywords': 'bg-amber-500/15 text-amber-700',
    'Deep Research': 'bg-blue-500/15 text-blue-700',
    'Write Article': 'bg-blue-500/15 text-blue-700',
    'Humanise': 'bg-blue-500/15 text-blue-700',
    'Review & Edit': 'bg-amber-500/15 text-amber-700',
    'Add Photos + SEO Check': 'bg-green-500/15 text-green-700',
    'Final Approval': 'bg-amber-500/15 text-amber-700',
    'Watermark Removal': 'bg-blue-500/15 text-blue-700',
    'Fact Check': 'bg-blue-500/15 text-blue-700',
    'Publish': 'bg-green-500/15 text-green-700',
    'Published': 'bg-success/15 text-success',
    'Needs Refresh': 'bg-destructive/15 text-destructive',
    'Refreshing': 'bg-accent/15 text-accent',
  };
  return (
    <Badge variant="secondary" className={`text-[10px] border-0 ${styles[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </Badge>
  );
}

export function ListView({ articles, selected, toggleSelect, toggleAll, onRowClick, onBlockedClick }: ListViewProps) {
  const [sortKey, setSortKey] = useState<string>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...articles].sort((a, b) => {
      let v = 0;
      if (sortKey === 'title') v = a.title.localeCompare(b.title);
      else if (sortKey === 'status') v = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      else if (sortKey === 'source') v = a.source.type.localeCompare(b.source.type);
      else if (sortKey === 'qualityScore') v = (a.qualityScore ?? 0) - (b.qualityScore ?? 0);
      else if (sortKey === 'priority') v = (['High', 'Medium', 'Low'].indexOf(a.priority)) - (['High', 'Medium', 'Low'].indexOf(b.priority));
      else if (sortKey === 'revenue') v = (['high', 'medium', 'low'].indexOf(a.revenuePotential)) - (['high', 'medium', 'low'].indexOf(b.revenuePotential));
      else if (sortKey === 'eeat') v = (a.hasExperience ? 0 : 1) - (b.hasExperience ? 0 : 1);
      else if (sortKey === 'blocked') v = (a.taskProgress?.hasBlocked ? 0 : 1) - (b.taskProgress?.hasBlocked ? 0 : 1);
      else if (sortKey === 'assigned') v = a.assignee.name.localeCompare(b.assignee.name);
      else if (sortKey === 'keyword') v = a.targetKeyword.localeCompare(b.targetKeyword);
      else if (sortKey === 'updatedAt') v = a.updatedAt.getTime() - b.updatedAt.getTime();
      else if (sortKey === 'createdAt') v = a.createdAt.getTime() - b.createdAt.getTime();
      return sortDir === 'desc' ? -v : v;
    });
  }, [articles, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ label, k }: { label: string; k: string }) => (
    <button onClick={() => handleSort(k)} className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground hover:text-foreground transition-colors">
      {label}
      {sortKey === k && <ArrowUpDown className="w-3 h-3" />}
    </button>
  );

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[32px_1fr_90px_100px_60px_60px_50px_60px_50px_80px_80px_70px_70px] items-center px-3 py-2 border-b border-border gap-2">
        <input type="checkbox" onChange={toggleAll} checked={selected.size === articles.length && articles.length > 0} className="w-3.5 h-3.5 rounded border-input" />
        <SortHeader label="Title" k="title" />
        <SortHeader label="Status" k="status" />
        <SortHeader label="Source" k="source" />
        <SortHeader label="Priority" k="priority" />
        <SortHeader label="Rev." k="revenue" />
        <SortHeader label="E-E-A-T" k="eeat" />
        <SortHeader label="Blocked" k="blocked" />
        <SortHeader label="QS" k="qualityScore" />
        <SortHeader label="Assigned" k="assigned" />
        <SortHeader label="Keyword" k="keyword" />
        <SortHeader label="Created" k="createdAt" />
        <SortHeader label="Updated" k="updatedAt" />
      </div>
      {/* Rows */}
      <div className="divide-y divide-border max-h-[calc(100vh-480px)] overflow-y-auto scrollbar-thin">
        {sorted.map(a => (
          <div key={a.id} onClick={() => onRowClick(a)} className={`grid grid-cols-[32px_1fr_90px_100px_60px_60px_50px_60px_50px_80px_80px_70px_70px] items-center px-3 py-2.5 gap-2 hover:bg-muted/30 transition-colors cursor-pointer ${
            selected.has(a.id) ? 'bg-accent/5' : ''
          }`}>
            <input type="checkbox" checked={selected.has(a.id)} onChange={e => { e.stopPropagation(); toggleSelect(a.id); }} className="w-3.5 h-3.5 rounded border-input" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-card-foreground truncate">{a.title}</p>
              {a.taskProgress && <TaskProgressBar progress={a.taskProgress} />}
            </div>
            <StatusBadge status={a.status} />
            <SourceBadge source={a.source} />
            <PriorityPill priority={a.priority} />
            <span className="text-[10px]">{a.revenuePotential === 'high' ? '💰' : a.revenuePotential === 'medium' ? '💵' : '—'}</span>
            <span className={`text-[10px] ${a.hasExperience ? 'text-success' : 'text-muted-foreground'}`}>
              {a.hasExperience ? '✓' : '—'}
            </span>
            {a.taskProgress?.hasBlocked ? (
              <button onClick={e => { e.stopPropagation(); onBlockedClick(a); }} className="text-[10px] font-medium text-destructive hover:underline">⚠ 1</button>
            ) : (
              <span className="text-[10px] text-muted-foreground">—</span>
            )}
            <span className="text-[11px] font-medium text-card-foreground">{['Discovered', 'Researching'].includes(a.status) ? '—' : (a.qualityScore || '—')}</span>
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[8px] font-medium">{a.assignee.avatar}</div>
              <span className="text-[10px] text-muted-foreground truncate">{a.assignee.name.split(' ')[0]}</span>
            </div>
            <span className="text-[10px] text-muted-foreground truncate">{a.targetKeyword}</span>
            <TimeAgo date={a.createdAt} className="text-[10px] text-muted-foreground" />
            <TimeAgo date={a.updatedAt} className="text-[10px] text-muted-foreground" />
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">No articles match your filters</div>
        )}
      </div>
    </div>
  );
}
