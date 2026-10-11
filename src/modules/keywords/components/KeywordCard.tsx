import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KDBar } from './shared/KDBar';
import { IntentBadge } from './shared/IntentBadge';
import { OpportunityBadge } from './shared/OpportunityBadge';
import { RevenuePill } from './shared/RevenuePill';
import { CpcTrendIndicator } from './shared/CpcTrendIndicator';
import { MiniSparkline } from './shared/MiniSparkline';
import { SerpFeaturePills } from './shared/SerpFeaturePills';
import type { KeywordOpportunity } from '../types';

interface KeywordCardProps {
  keyword: KeywordOpportunity;
  onClick: () => void;
  onResearch: () => void;
  onRefresh: () => void;
  canPerformActions: boolean;
}

export function KeywordCard({
  keyword: kw,
  onClick,
  onResearch,
  onRefresh,
  canPerformActions,
}: KeywordCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{kw.keyword}</p>
            <p className="text-xs text-muted-foreground mt-1">{kw.topicCluster}</p>
          </div>
          <OpportunityBadge score={kw.opportunityScore} />
        </div>

        <div className="flex items-center gap-2">
          <IntentBadge intent={kw.intent} />
          <RevenuePill revenue={kw.revenuePotential} />
          <Badge variant={kw.ethStatus === 'ranking' ? 'default' : 'secondary'}>
            {kw.ethStatus === 'ranking' ? `#${kw.ethRankPosition}` : 'No Content'}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Volume</p>
            <p className="font-medium tabular-nums">{kw.searchVolume.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">KD</p>
            <KDBar kd={kw.kd} />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">CPC</p>
            <CpcTrendIndicator cpc={kw.cpc} trend={kw.cpcTrend} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <MiniSparkline data={kw.monthlyTrend} />
          <SerpFeaturePills features={kw.serpFeatures.slice(0, 3)} />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Gap: {kw.contentGapScore}</span>
          <span>Backlinks: {kw.backlinksToRank}</span>
          <span>{kw.competitors.length} competitors</span>
        </div>

        {canPerformActions && (
          <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            {kw.ethStatus === 'no-content' ? (
              <Button size="sm" className="w-full" onClick={onResearch}>Research</Button>
            ) : (
              <Button size="sm" variant="outline" className="w-full" onClick={onRefresh}>Refresh</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
