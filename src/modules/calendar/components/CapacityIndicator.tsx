import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface CapacityIndicatorProps {
  label: string;
  current: number;
  target: number;
}

function getCapacityColor(percentage: number): string {
  if (percentage >= 80) return 'text-success';
  if (percentage >= 50) return 'text-amber-600';
  return 'text-destructive';
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return '[&>div]:bg-success';
  if (percentage >= 50) return '[&>div]:bg-warning';
  return '[&>div]:bg-destructive';
}

export function CapacityIndicator({ label, current, target }: CapacityIndicatorProps) {
  const percentage = target > 0 ? Math.round((current / target) * 100) : 0;
  const clampedPercentage = Math.min(percentage, 100);

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-[12px] font-medium text-muted-foreground w-16 shrink-0">{label}</span>
      <Progress
        value={clampedPercentage}
        className={cn(
          'h-1.5 flex-1 rounded-full bg-muted [&>div]:rounded-full [&>div]:transition-all [&>div]:duration-300 [&>div]:ease-out',
          getProgressColor(percentage)
        )}
      />
      <span className={cn('font-semibold w-10 text-right shrink-0 tabular-nums', getCapacityColor(percentage))}>
        {current}/{target}
      </span>
    </div>
  );
}
