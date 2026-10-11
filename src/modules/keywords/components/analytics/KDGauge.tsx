import { cn } from '@/lib/utils';

interface KDGaugeProps {
  /** Keyword difficulty 0–100. */
  value: number;
  className?: string;
}

/** SEMRush-style KD buckets; colors match the KDBar scale. */
function kdMeta(kd: number): { label: string; hint: string; color: string } {
  if (kd <= 14) return { label: 'Very easy', hint: 'Rankable with fresh, well-targeted content.', color: '#22c55e' };
  if (kd <= 29) return { label: 'Easy', hint: 'Good opportunity — quality content should rank.', color: '#84cc16' };
  if (kd <= 49) return { label: 'Possible', hint: 'Needs well-structured, unique content.', color: '#eab308' };
  if (kd <= 69) return { label: 'Difficult', hint: 'Requires strong content and some backlinks.', color: '#f97316' };
  if (kd <= 84) return { label: 'Hard', hint: 'Competitive — needs backlinks and authority.', color: '#ef4444' };
  return { label: 'Very hard', hint: 'Dominated by high-authority domains.', color: '#dc2626' };
}

/**
 * Semicircular keyword-difficulty gauge (SEMRush Keyword Overview style):
 * colored arc proportional to KD with the % and bucket label beneath.
 */
export function KDGauge({ value, className }: KDGaugeProps) {
  const kd = Math.min(100, Math.max(0, Math.round(value)));
  const { label, hint, color } = kdMeta(kd);

  // Semicircle from 180° to 0°, radius 40, centered at (50, 50).
  const angle = Math.PI * (1 - kd / 100);
  const x = 50 + 40 * Math.cos(angle);
  const y = 50 - 40 * Math.sin(angle);
  const largeArc = kd > 50 ? 1 : 0;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg viewBox="0 0 100 56" className="w-40">
        <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" strokeLinecap="round" />
        {kd > 0 && (
          <path
            d={`M 10 50 A 40 40 0 ${largeArc} 1 ${x} ${y}`}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
          />
        )}
        <text x="50" y="44" textAnchor="middle" className="fill-foreground" fontSize="18" fontWeight="700">
          {kd}%
        </text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
      <p className="mt-1 text-center text-xs text-muted-foreground max-w-[200px]">{hint}</p>
    </div>
  );
}
