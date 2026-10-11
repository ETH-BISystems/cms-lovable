import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SERPSnapshot } from '../../types';

interface SERPHistoryPanelProps {
  snapshots: SERPSnapshot[];
}

export function SERPHistoryPanel({ snapshots }: SERPHistoryPanelProps) {
  const [activeDate, setActiveDate] = useState(
    snapshots.length > 0 ? snapshots[0].date : ''
  );

  if (snapshots.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4">
        No SERP history available yet.
      </p>
    );
  }

  const snapshot = snapshots.find((s) => s.date === activeDate) ?? snapshots[0];

  return (
    <div>
      {/* Date selector */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">Snapshot:</span>
        {snapshots.map((s) => (
          <button
            key={s.date}
            onClick={() => setActiveDate(s.date)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
              s.date === activeDate
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {s.date}
          </button>
        ))}
      </div>

      {/* SERP snapshot table */}
      <div className="bg-background rounded-lg border border-border p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-foreground">
            SERP on {snapshot.date}
          </p>
          {snapshot.featuredSnippet && (
            <Badge variant="outline" className="text-[10px]">
              Featured Snippet: {snapshot.featuredSnippet}
            </Badge>
          )}
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-1.5 text-left w-12">Rank</th>
              <th className="py-1.5 text-left">Domain</th>
              <th className="py-1.5 text-left">Page Title</th>
              <th className="py-1.5 text-left">SERP Features</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.results.map((r) => (
              <tr
                key={r.rank}
                className={cn(
                  'border-b border-border/50',
                  r.isETH
                    ? 'bg-accent/10'
                    : r.isCompetitor
                      ? 'bg-warning/5'
                      : ''
                )}
              >
                <td className="py-1.5 font-bold text-foreground">#{r.rank}</td>
                <td className="py-1.5">
                  <span
                    className={cn(
                      'font-medium',
                      r.isETH
                        ? 'text-accent'
                        : r.isCompetitor
                          ? 'text-warning-foreground'
                          : 'text-foreground'
                    )}
                  >
                    {r.domain}
                  </span>
                  {r.isETH && (
                    <Badge className="ml-1 bg-accent/15 text-accent border-accent/30 text-[8px] h-3.5">
                      ETH
                    </Badge>
                  )}
                </td>
                <td className="py-1.5 text-muted-foreground truncate max-w-[200px]">
                  {r.title}
                </td>
                <td className="py-1.5">
                  <div className="flex gap-1">
                    {r.features.map((f) => (
                      <span
                        key={f}
                        className="text-[9px] font-semibold px-1 py-0.5 rounded"
                        style={{
                          background: 'hsl(213 93% 95%)',
                          color: 'hsl(217 91% 60%)',
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
