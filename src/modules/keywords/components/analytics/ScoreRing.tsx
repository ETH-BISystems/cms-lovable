import { cn } from '@/lib/utils';

interface ScoreRingProps {
  /** Score 0–100, or null when unavailable. */
  value: number | null;
  label: string;
  size?: number;
  className?: string;
}

/** Lighthouse-convention colors: ≥90 green, ≥50 amber, <50 red. */
function ringColor(value: number): string {
  if (value >= 90) return '#22c55e';
  if (value >= 50) return '#f59e0b';
  return '#ef4444';
}

/** Circular score ring (Lighthouse-style) with the value centered. */
export function ScoreRing({ value, label, size = 88, className }: ScoreRingProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const clamped = value === null ? 0 : Math.min(100, Math.max(0, Math.round(value)));
  const color = value === null ? 'hsl(var(--muted-foreground))' : ringColor(clamped);

  return (
    <div className={cn('flex flex-col items-center gap-1.5', className)}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        {value !== null && (
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.32,0.72,0,1)' }}
          />
        )}
        <text x="50" y="56" textAnchor="middle" fontSize="24" fontWeight="700" className="fill-foreground">
          {value === null ? '—' : clamped}
        </text>
      </svg>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
