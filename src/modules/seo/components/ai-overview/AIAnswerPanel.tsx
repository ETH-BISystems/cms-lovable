import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AIOverviewDoc } from '../../types';
import { ComparePanel } from './ComparePanel';

interface AIAnswerPanelProps {
  overview: AIOverviewDoc;
}

function highlightBg(accuracy: 'accurate' | 'partial' | 'inaccurate') {
  if (accuracy === 'accurate')
    return 'bg-success/10 border-l-2 border-l-success';
  if (accuracy === 'partial')
    return 'bg-warning/10 border-l-2 border-l-warning';
  return 'bg-destructive/10 border-l-2 border-l-destructive';
}

export function AIAnswerPanel({ overview }: AIAnswerPanelProps) {
  const [compareView, setCompareView] = useState(false);

  if (!overview.aiAnswer) {
    return null;
  }

  const { aiAnswer } = overview;

  return (
    <div className="bg-muted/30 border-t border-border p-5">
      <div className="flex gap-6">
        {/* Left Column — 60% */}
        <div className="flex-[3] min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              Google AI Answer for:{' '}
              <span className="text-accent">"{overview.keyword}"</span>
            </h4>
          </div>

          {/* Claims with highlighting */}
          <div className="space-y-2">
            {aiAnswer.claims.map((claim, ci) => (
              <div
                key={ci}
                className={cn(
                  'px-3 py-2 rounded-md text-xs text-foreground',
                  highlightBg(claim.accuracy)
                )}
              >
                {claim.text}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-accent border-accent hover:bg-accent/10 text-xs h-7"
              onClick={() =>
                toast.info(
                  `Opening optimization for "${overview.keyword}"…`
                )
              }
            >
              Optimize for This Answer
            </Button>
            <Button
              size="sm"
              className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-7"
              onClick={() =>
                toast.info(
                  `Creating content to get cited for "${overview.keyword}"…`
                )
              }
            >
              Create Content to Get Cited
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-muted-foreground text-xs h-7"
              onClick={() => setCompareView(!compareView)}
            >
              <Eye className="w-3 h-3 mr-1" /> Compare to ETH Content
            </Button>
          </div>

          {/* Compare View */}
          {compareView && <ComparePanel overview={overview} />}
        </div>

        {/* Right Column — 40% */}
        <div className="flex-[2] min-w-0 space-y-4">
          {/* Sources */}
          <div>
            <h5 className="text-xs font-semibold text-foreground mb-2">
              Sources Cited by Google AI
            </h5>
            <div className="space-y-1.5">
              {aiAnswer.sources.map((src, si) => (
                <div
                  key={si}
                  className={cn(
                    'flex items-center gap-2 text-xs px-2 py-1.5 rounded',
                    src.isETH
                      ? 'bg-accent/10 border-l-2 border-l-accent'
                      : 'bg-background'
                  )}
                >
                  <span className="text-[10px] font-bold text-muted-foreground w-4">
                    {si + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-medium truncate">
                      {src.domain}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {src.url}
                    </p>
                  </div>
                  {src.isETH && (
                    <Badge className="bg-accent/15 text-accent border-accent/30 text-[9px] shrink-0">
                      ✅ ETH Cited
                    </Badge>
                  )}
                  {src.isCompetitor && (
                    <Badge
                      variant="outline"
                      className="text-[9px] text-muted-foreground shrink-0"
                    >
                      Competitor
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Follow-Up Questions */}
          <div>
            <h5 className="text-xs font-semibold text-foreground mb-2">
              Follow-Up Questions
            </h5>
            <div className="space-y-1.5">
              {aiAnswer.followUpQuestions.map((fq, fi) => (
                <div
                  key={fi}
                  className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 bg-background rounded"
                >
                  <span className="text-foreground">{fq.question}</span>
                  {fq.tracked ? (
                    <span className="text-accent text-[10px] font-medium shrink-0">
                      Tracking ✓
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 text-[9px] px-2 shrink-0"
                      onClick={() =>
                        toast.success(`Now tracking: "${fq.question}"`)
                      }
                    >
                      Track
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
