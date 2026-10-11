import { cn } from '@/lib/utils';
import { formatDeltaPct } from '../shared/trafficFormat';

interface SignedDeltaProps {
  /** Percentage-point delta; null/undefined renders an em dash. */
  value: number | null | undefined;
  className?: string;
}

/** Signed percentage delta, green for growth and red for decline. */
export function SignedDelta({ value, className }: SignedDeltaProps) {
  const positive = typeof value === 'number' && value > 0;
  const negative = typeof value === 'number' && value < 0;
  return (
    <span
      className={cn(
        'tabular-nums font-medium',
        positive && 'text-green-600',
        negative && 'text-red-600',
        !positive && !negative && 'text-muted-foreground',
        className,
      )}
    >
      {formatDeltaPct(value)}
    </span>
  );
}
