import { Sparkles } from 'lucide-react';
import type { AIOverviewDoc } from '../../types';

interface InsightBannerProps {
  stats: {
    keywordsWithAIOverview: number;
    ethCitedCount: number;
    estCtrImpact: number;
    trafficAtRisk: number;
  };
  overviews: AIOverviewDoc[];
  totalKeywords: number;
}

export function InsightBanner({
  stats,
  overviews,
  totalKeywords,
}: InsightBannerProps) {
  const aioPercent =
    totalKeywords > 0
      ? ((stats.keywordsWithAIOverview / totalKeywords) * 100).toFixed(1)
      : '0';

  const citedPct =
    stats.keywordsWithAIOverview > 0
      ? ((stats.ethCitedCount / stats.keywordsWithAIOverview) * 100).toFixed(1)
      : '0';

  // Find highest-risk keyword (most negative CTR impact, not cited)
  const highestRisk = overviews
    .filter((ov) => ov.hasAIOverview && ov.ethCited !== 'Yes')
    .sort((a, b) => a.ctrImpact - b.ctrImpact)[0];

  return (
    <div className="bg-card rounded-lg border border-border p-4 border-l-4 border-l-accent">
      <div className="flex gap-2">
        <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          <strong>{aioPercent}%</strong> of your tracked keywords now show AI
          Overviews. ETH is cited in only <strong>{citedPct}%</strong> of
          relevant AI Overviews — there's room to improve.
          {highestRisk && (
            <>
              {' '}
              Highest-risk keyword:{' '}
              <strong>"{highestRisk.keyword}"</strong> (
              {highestRisk.volume.toLocaleString()} volume, {highestRisk.ctrImpact}%
              CTR impact, ETH not cited).{' '}
              <strong>Recommendation:</strong> Optimize your content for this
              keyword to increase citation likelihood.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
