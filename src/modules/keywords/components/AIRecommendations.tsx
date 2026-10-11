import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { IntentBadge } from './shared/IntentBadge';
import { SerpFeaturePills } from './shared/SerpFeaturePills';
import { OpportunityBadge } from './shared/OpportunityBadge';
import { RevenuePill } from './shared/RevenuePill';
import type { KeywordOpportunity } from '../types';

interface AIRecommendationsProps {
  keywords: KeywordOpportunity[];
  onKeywordClick: (id: string) => void;
  onResearch: (keyword: KeywordOpportunity) => void;
  canPerformActions: boolean;
}

export function AIRecommendations({
  keywords,
  onKeywordClick,
  onResearch,
  canPerformActions,
}: AIRecommendationsProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Top 10 by opportunity score
  const top10 = keywords
    .slice()
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 10);

  if (top10.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full flex items-center justify-between p-4 h-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">This Week&apos;s Top 10 Recommendations</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 px-4 pb-4">
          {top10.map((kw, index) => (
            <div
              key={kw.id}
              className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer group"
              onClick={() => onKeywordClick(kw.id)}
            >
              <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{kw.keyword}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{kw.aiRationale}</p>
              </div>
              <IntentBadge intent={kw.intent} />
              <SerpFeaturePills features={kw.serpFeatures.slice(0, 3)} />
              <OpportunityBadge score={kw.opportunityScore} />
              <RevenuePill revenue={kw.revenuePotential} />
              {canPerformActions && (
                <Button
                  size="sm"
                  variant="outline"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResearch(kw);
                  }}
                >
                  Research
                </Button>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
