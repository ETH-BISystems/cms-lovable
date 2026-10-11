import { cn } from '@/lib/utils';
import type { AIOverviewDoc } from '../../types';

interface ComparePanelProps {
  overview: AIOverviewDoc;
}

function highlightBg(accuracy: 'accurate' | 'partial' | 'inaccurate') {
  if (accuracy === 'accurate')
    return 'bg-success/10 border-l-2 border-l-success';
  if (accuracy === 'partial')
    return 'bg-warning/10 border-l-2 border-l-warning';
  return 'bg-destructive/10 border-l-2 border-l-destructive';
}

export function ComparePanel({ overview }: ComparePanelProps) {
  if (!overview.aiAnswer) {
    return (
      <p className="text-xs text-muted-foreground py-4">
        No AI answer data available for comparison.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 mt-3 border border-border rounded-lg overflow-hidden">
      {/* Google AI Answer */}
      <div className="p-3 bg-muted/20">
        <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Google AI Answer
        </p>
        <div className="space-y-1.5 text-xs text-foreground">
          {overview.aiAnswer.claims.map((c, ci) => (
            <p
              key={ci}
              className={cn('px-2 py-1 rounded', highlightBg(c.accuracy))}
            >
              {c.text}
            </p>
          ))}
        </div>
      </div>

      {/* ETH Published Content */}
      <div className="p-3 bg-accent/5">
        <p className="text-[10px] font-semibold text-accent mb-2 uppercase tracking-wider">
          ETH Published Content
        </p>
        <div className="space-y-1.5 text-xs text-foreground">
          <p className="px-2 py-1 rounded bg-success/5 border-l-2 border-l-success">
            Content matching the AI answer claims would appear here, highlighting
            areas where ETH content aligns with or differs from the AI-generated
            response.
          </p>
          <p className="px-2 py-1 rounded">
            This comparison helps identify gaps in your content that could be
            addressed to improve AI Overview citation likelihood.
          </p>
          <p className="px-2 py-1 rounded bg-destructive/5 border-l-2 border-l-destructive">
            Claims marked in red indicate areas where your content may contain
            different information than what Google's AI is presenting.
          </p>
        </div>
      </div>
    </div>
  );
}
