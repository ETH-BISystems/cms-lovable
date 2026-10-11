import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Activity } from 'lucide-react';
import type { ActivityLogEntry } from '../types/index';

interface ActivityLogProps {
  entries: ActivityLogEntry[];
}

/**
 * Collapsible activity log section.
 * Displays timestamped entries of all edition actions.
 *
 * Requirements: 11.4, 11.5
 */
export function ActivityLog({ entries }: ActivityLogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortedEntries = [...entries].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            Activity Log ({entries.length})
          </span>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-1 px-3 pb-3 max-h-64 overflow-y-auto">
          {sortedEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No activity yet.</p>
          ) : (
            sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 py-1.5 text-xs border-b border-border/50 last:border-0"
              >
                <span className="text-muted-foreground whitespace-nowrap min-w-[100px]">
                  {formatTimestamp(entry.timestamp)}
                </span>
                <span>
                  <span className="font-medium">{entry.actor}</span>{' '}
                  <span className="text-muted-foreground">{entry.action}</span>
                </span>
              </div>
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatTimestamp(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
