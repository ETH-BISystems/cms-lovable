import { cn } from '@/lib/utils';

interface KDBarProps {
  kd: number;
  className?: string;
}

function getKDColor(kd: number): string {
  if (kd <= 30) return 'bg-green-500';
  if (kd <= 60) return 'bg-yellow-500';
  if (kd <= 80) return 'bg-orange-500';
  return 'bg-red-500';
}

function getKDTextColor(kd: number): string {
  if (kd <= 30) return 'text-green-700';
  if (kd <= 60) return 'text-yellow-700';
  if (kd <= 80) return 'text-orange-700';
  return 'text-red-700';
}

export function KDBar({ kd, className }: KDBarProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getKDColor(kd))}
          style={{ width: `${kd}%` }}
        />
      </div>
      <span className={cn('text-xs font-medium tabular-nums', getKDTextColor(kd))}>
        {kd}
      </span>
    </div>
  );
}
