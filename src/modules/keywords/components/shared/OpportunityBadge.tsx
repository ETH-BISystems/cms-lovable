import { cn } from '@/lib/utils';

interface OpportunityBadgeProps {
  score: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'bg-green-100 text-green-800 border-green-300';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

export function OpportunityBadge({ score, className }: OpportunityBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-full border text-xs font-bold tabular-nums',
        getScoreColor(score),
        className,
      )}
    >
      {score}
    </div>
  );
}
