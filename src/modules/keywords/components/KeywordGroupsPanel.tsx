import { cn } from '@/lib/utils';
import type { KeywordGroup } from '../types/magic';

interface KeywordGroupsPanelProps {
  groups: KeywordGroup[];
  totalCount: number;
  activeGroup: string | null;
  onSelectGroup: (group: string | null) => void;
}

/**
 * Left sidebar listing keyword groups (clusters by common word).
 * Clicking a group filters the results table; clicking again clears it.
 */
export function KeywordGroupsPanel({ groups, totalCount, activeGroup, onSelectGroup }: KeywordGroupsPanelProps) {
  return (
    <div className="w-full h-full flex flex-col border border-border rounded-lg overflow-hidden bg-card">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Groups</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <button
          onClick={() => onSelectGroup(null)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 text-left transition-colors border-b border-border/50',
            activeGroup === null ? 'bg-accent/10 font-semibold text-foreground' : 'hover:bg-muted/50 text-foreground'
          )}
        >
          <span className="text-[12px]">All keywords</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">{totalCount.toLocaleString()}</span>
        </button>
        {groups.map(group => (
          <button
            key={group.name}
            onClick={() => onSelectGroup(group.name)}
            className={cn(
              'w-full px-3 py-1.5 text-left transition-colors border-b border-border/30',
              activeGroup === group.name ? 'bg-accent/10' : 'hover:bg-muted/50'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn('text-[12px] truncate', activeGroup === group.name ? 'font-semibold text-foreground' : 'text-foreground')}>
                {group.name}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{group.count.toLocaleString()}</span>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {group.totalVolume.toLocaleString()} vol
            </span>
          </button>
        ))}
        {groups.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">No groups</p>
        )}
      </div>
    </div>
  );
}
