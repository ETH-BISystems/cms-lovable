import { cn } from '@/lib/utils';

interface SEOScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500 border-green-500/30 bg-green-500/10';
  if (score >= 80) return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
  if (score >= 70) return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
  if (score >= 60) return 'text-orange-500 border-orange-500/30 bg-orange-500/10';
  return 'text-red-500 border-red-500/30 bg-red-500/10';
}

const SIZE_MAP = {
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-10 h-10 text-[12px]',
  lg: 'w-14 h-14 text-[16px]',
} as const;

export function SEOScoreBadge({ score, size = 'md' }: SEOScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 font-bold shrink-0',
        getScoreColor(clamped),
        SIZE_MAP[size]
      )}
    >
      {clamped}
    </div>
  );
}
