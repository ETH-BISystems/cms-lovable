import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AuditRunDoc, AuditHistoryFilters } from '../../types';

interface AuditHistoryTabProps {
  runs: AuditRunDoc[];
  filters: AuditHistoryFilters;
  onFiltersChange: (filters: AuditHistoryFilters) => void;
  onViewResults: (runDate: string) => void;
}

function scoreColor(s: number) {
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-warning';
  return 'text-destructive';
}

function HistoryTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    Scheduled: {
      label: '🔄 Scheduled',
      cls: 'bg-accent/15 text-accent border-accent/30',
    },
    Manual: {
      label: '👤 Manual',
      cls: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    },
    Publish: {
      label: '⚡ Publish',
      cls: 'bg-success/15 text-success border-success/30',
    },
    Traffic: {
      label: '📉 Traffic',
      cls: 'bg-warning/15 text-warning border-warning/30',
    },
    Ranking: {
      label: '📊 Ranking',
      cls: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
    },
  };
  const m = map[type] || map.Manual;
  return (
    <Badge variant="outline" className={cn('text-xs', m.cls)}>
      {m.label}
    </Badge>
  );
}

export function AuditHistoryTab({
  runs,
  filters,
  onFiltersChange,
  onViewResults,
}: AuditHistoryTabProps) {
  const [page, setPage] = useState(1);
  const perPage = 25;

  const paged = runs.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(runs.length / perPage));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Type</label>
          <Select
            value={filters.type}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                type: v as AuditHistoryFilters['type'],
              })
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Manual">Manual</SelectItem>
              <SelectItem value="Publish">Publish</SelectItem>
              <SelectItem value="Traffic">Traffic</SelectItem>
              <SelectItem value="Ranking">Ranking</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Triggered By
          </label>
          <Select
            value={filters.triggeredBy || 'all'}
            onValueChange={(v) =>
              onFiltersChange({
                ...filters,
                triggeredBy: v === 'all' ? '' : v,
              })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="System">System</SelectItem>
              <SelectItem value="Auto">Auto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  DATE
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  TYPE
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  TRIGGERED BY
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ARTICLES
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  AVG SCORE
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  CHANGE
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  CRITICAL
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  NEW ISSUES
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  RESOLVED
                </th>
                <th className="px-3 py-3 text-left font-medium text-muted-foreground">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((h, i) => {
                const dateStr =
                  h.createdAt instanceof Date
                    ? h.createdAt.toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : String(h.createdAt);

                return (
                  <tr
                    key={h.runId}
                    className={cn(
                      'border-b border-border hover:bg-muted/30',
                      i % 2 === 1 ? 'bg-muted/20' : ''
                    )}
                  >
                    <td className="px-3 py-3 text-foreground whitespace-nowrap">
                      {dateStr}
                    </td>
                    <td className="px-3 py-3">
                      <HistoryTypeBadge type={h.triggerType} />
                    </td>
                    <td className="px-3 py-3 text-foreground">
                      {h.triggeredBy}
                    </td>
                    <td className="px-3 py-3 text-foreground">
                      {h.articleCount}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'font-bold',
                          scoreColor(h.avgScore ?? 0)
                        )}
                      >
                        {h.avgScore ?? '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {h.scoreChange == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : h.scoreChange > 0 ? (
                        <span className="text-success font-semibold">
                          ↑{h.scoreChange}
                        </span>
                      ) : (
                        <span className="text-destructive font-semibold">
                          ↓{Math.abs(h.scoreChange)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          h.criticalCount > 0
                            ? 'text-destructive font-semibold'
                            : 'text-foreground'
                        }
                      >
                        {h.criticalCount}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-foreground">
                      {h.newIssues ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      {h.resolvedIssues == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="text-success">
                          {h.resolvedIssues}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewResults(dateStr)}
                        className="text-accent border-accent hover:bg-accent/10 text-xs h-7"
                      >
                        View Results
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-muted-foreground text-sm"
                  >
                    No audit history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * perPage + 1}–
            {Math.min(page * perPage, runs.length)} of {runs.length}
          </p>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 text-xs rounded border border-border disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
