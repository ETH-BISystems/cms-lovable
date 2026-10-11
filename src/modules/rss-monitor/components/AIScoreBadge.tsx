import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type AiScoreColor = 'green' | 'yellow' | 'grey';

export function getAiScoreColor(score: number): AiScoreColor {
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'grey';
}

const colorClasses: Record<AiScoreColor, string> = {
  green: 'bg-green-100 text-green-700 border-green-300',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  grey: 'bg-gray-100 text-gray-500 border-gray-300',
};

interface AIScoreBadgeProps {
  score: number;
  rationale?: string;
}

export function AIScoreBadge({ score, rationale }: AIScoreBadgeProps) {
  const color = getAiScoreColor(score);

  const badge = (
    <div
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full border text-sm font-semibold ${colorClasses[color]}`}
    >
      {score}
    </div>
  );

  if (!rationale) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{rationale}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
