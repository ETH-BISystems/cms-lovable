import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KDBar } from './shared/KDBar';
import { IntentBadge } from './shared/IntentBadge';
import { SerpFeaturePills } from './shared/SerpFeaturePills';
import { OpportunityBadge } from './shared/OpportunityBadge';
import { RevenuePill } from './shared/RevenuePill';
import { CpcTrendIndicator } from './shared/CpcTrendIndicator';
import { MiniSparkline } from './shared/MiniSparkline';
import { useKeywordDetail } from '../hooks/useKeywordDetail';
import type { KeywordOpportunity } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface KeywordDetailPanelProps {
  keywordId: string | null;
  open: boolean;
  onClose: () => void;
  onResearch: (keyword: KeywordOpportunity) => void;
  onRefresh: (keyword: KeywordOpportunity) => void;
  canPerformActions: boolean;
}

export function KeywordDetailPanel({
  keywordId,
  open,
  onClose,
  onResearch,
  onRefresh,
  canPerformActions,
}: KeywordDetailPanelProps) {
  const { keyword: kw, loading } = useKeywordDetail(keywordId);

  const trendChartData = kw?.monthlyTrend.map((value, i) => ({
    month: `M${i + 1}`,
    volume: value,
  })) ?? [];

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
        {loading ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : kw ? (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg">{kw.keyword}</SheetTitle>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="text-lg font-bold tabular-nums">{kw.searchVolume.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">KD</p>
                  <KDBar kd={kw.kd} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPC</p>
                  <CpcTrendIndicator cpc={kw.cpc} trend={kw.cpcTrend} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gap Score</p>
                  <p className="text-lg font-bold tabular-nums">{kw.contentGapScore}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <IntentBadge intent={kw.intent} />
                <OpportunityBadge score={kw.opportunityScore} />
                <RevenuePill revenue={kw.revenuePotential} />
              </div>

              <div className="text-sm">
                <p className="text-xs text-muted-foreground mb-1">Backlinks to Rank</p>
                <p className="font-medium">{kw.backlinksToRank}</p>
              </div>

              <Separator />

              {/* SERP Features */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">SERP Features</p>
                <SerpFeaturePills features={kw.serpFeatures} />
              </div>

              {/* AI Rationale */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">AI Rationale</p>
                <p className="text-sm">{kw.aiRationale}</p>
              </div>

              {/* Revenue Potential */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Revenue Potential</p>
                <RevenuePill revenue={kw.revenuePotential} />
                <p className="text-sm mt-1">{kw.revenueRationale}</p>
                {kw.cardLinksTo && kw.cardLinksTo.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {kw.cardLinksTo.map((cardId) => (
                      <Badge key={cardId} variant="outline" className="text-xs">{cardId}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* ETH Status */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">ETH Status</p>
                <Badge variant={kw.ethStatus === 'ranking' ? 'default' : 'secondary'}>
                  {kw.ethStatus === 'ranking' ? `Ranking #${kw.ethRankPosition}` : 'No Content'}
                </Badge>
                {kw.ethArticleTitle && (
                  <p className="text-sm mt-1">{kw.ethArticleTitle}</p>
                )}
              </div>

              {/* Position History (for ranked keywords) */}
              {kw.positionHistory && kw.positionHistory.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Position Tracking (30 days)</p>
                  <MiniSparkline data={kw.positionHistory} width={400} height={60} />
                </div>
              )}

              <Separator />

              {/* Competitor Rankings */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Competitor Rankings</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Words</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kw.competitors.map((c) => (
                      <TableRow key={c.site}>
                        <TableCell className="font-medium text-xs">{c.site}</TableCell>
                        <TableCell><Badge variant="outline">#{c.position}</Badge></TableCell>
                        <TableCell className="text-xs max-w-[120px] truncate">{c.pageTitle}</TableCell>
                        <TableCell className="tabular-nums text-xs">{c.wordCount.toLocaleString()}</TableCell>
                        <TableCell className="text-xs">{c.datePublished}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Top Google Results */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Top Google Results</p>
                <div className="space-y-2">
                  {kw.topGoogleResults.map((result, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-4">{i + 1}</span>
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1">
                        {result.title}
                      </a>
                      <span className="text-xs text-muted-foreground tabular-nums">{result.wordCount.toLocaleString()} words</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Keywords */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Related Keywords</p>
                <div className="space-y-1">
                  {kw.relatedKeywords.map((rk) => (
                    <div key={rk.keyword} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{rk.keyword}</span>
                      <span className="tabular-nums text-muted-foreground">{rk.volume.toLocaleString()}</span>
                      <IntentBadge intent={rk.intent} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 12-Month Search Trend Chart */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">12-Month Search Trend</p>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={trendChartData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Area type="monotone" dataKey="volume" stroke="#3b82f6" fill="#3b82f680" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <Separator />

              {/* Editorial Notes */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Editorial Notes</p>
                <Textarea placeholder="Add notes about this keyword..." rows={3} />
              </div>

              {/* Action Button */}
              {canPerformActions && (
                <div className="pt-4">
                  {kw.ethStatus === 'no-content' ? (
                    <Button className="w-full" onClick={() => onResearch(kw)}>Research This Keyword</Button>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={() => onRefresh(kw)}>Refresh Article</Button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a keyword to view details
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
