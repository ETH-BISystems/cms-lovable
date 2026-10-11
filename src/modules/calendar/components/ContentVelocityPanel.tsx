import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VelocityMetrics } from '../types';

interface ContentVelocityPanelProps {
  velocity: VelocityMetrics;
}

export function ContentVelocityPanel({ velocity }: ContentVelocityPanelProps) {
  const maxCount = Math.max(
    ...velocity.dailyCounts.map((d) => d.count),
    Math.ceil(velocity.dailyTarget),
    1
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        {velocity.onPace ? (
          <TrendingUp className="h-3.5 w-3.5 text-success" />
        ) : (
          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
        )}
        Content Velocity
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-20 relative">
        {/* Target line */}
        {velocity.dailyTarget > 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-warning/60"
            style={{
              bottom: `${(velocity.dailyTarget / maxCount) * 100}%`,
            }}
          >
            <span className="absolute -top-3 right-0 text-[9px] text-amber-600">
              target
            </span>
          </div>
        )}

        {velocity.dailyCounts.map((day) => {
          const heightPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          const meetsTarget = day.count >= velocity.dailyTarget;

          return (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex items-end justify-center h-16">
                <div
                  className={cn(
                    'w-full max-w-[24px] rounded-t-sm transition-all duration-300 ease-out',
                    meetsTarget ? 'bg-success/70' : 'bg-destructive/30'
                  )}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{day.day}</span>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[12px] text-muted-foreground">
          {velocity.weeklyTotal} / {velocity.weeklyTarget} this week
        </span>
        {velocity.onPace ? (
          <span className="text-success font-medium">On pace</span>
        ) : (
          <span className="text-destructive font-medium">
            {velocity.deficit} behind
          </span>
        )}
      </div>
    </div>
  );
}
